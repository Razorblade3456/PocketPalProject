// Keep the Windows launcher independent of the caller's working directory/PATH.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const logPath = path.join(root, 'desktop-launch.log');
function log(message) { console.error(message); fs.appendFileSync(logPath, message + '\n'); }
try {
  fs.writeFileSync(logPath, `PocketPal Desktop Pet · ${new Date().toISOString()}\nNode ${process.version} (${process.arch})\nWindows: ${os.release()}\nProject: ${root}\n`);
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12)) throw Error('Node.js 22.12 or newer is required.');
  // Electron's downloader can fail when moving between Windows sandbox temp/cache locations.
  // Use local writable cache/temp folders only if its binary needs downloading.
  const originalTemp = process.env.TEMP;
  const originalCache = process.env.electron_config_cache;
  delete process.env.ELECTRON_RUN_AS_NODE;
  delete process.env.ELECTRON_OVERRIDE_DIST_PATH;
  let executable;
  try {
    process.env.electron_config_cache = path.join(root, 'node_modules', '.electron-cache');
    process.env.TEMP = path.join(root, 'node_modules', '.electron-temp');
    fs.mkdirSync(process.env.TEMP, { recursive: true });
    executable = require('electron');
  } finally {
    if (originalTemp === undefined) delete process.env.TEMP; else process.env.TEMP = originalTemp;
    if (originalCache === undefined) delete process.env.electron_config_cache; else process.env.electron_config_cache = originalCache;
  }
  const entry = path.join(__dirname, 'main.cjs');
  if (!fs.existsSync(path.join(root, 'dist-desktop', 'companion.html'))) throw Error('Companion build is missing. Run npm run desktop:build first.');
  log(`Electron: ${require('electron/package.json').version}\nStarting: ${executable}\nEntry: ${entry}`);
  let mainReached = false;
  let startupTail = '';
  const child = spawn(executable, [entry], { cwd: root, env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }, stdio: ['inherit', 'pipe', 'pipe'], windowsHide: true });
  child.stdout.on('data', data => { startupTail = (startupTail + data.toString()).slice(-512); if (startupTail.includes('[PocketPal desktop] main entry reached')) mainReached = true; process.stdout.write(data); fs.appendFileSync(logPath, data); });
  child.stderr.on('data', data => { process.stderr.write(data); fs.appendFileSync(logPath, data); });
  child.on('error', error => { log(`Electron could not be started: ${error.message}`); process.exitCode = 1; });
  child.on('close', (code, signal) => {
    if (code !== 0) {
      const hex = typeof code === 'number' ? ` (0x${(code >>> 0).toString(16).toUpperCase()})` : '';
      log(`Electron exited with code ${code}${hex}${signal ? `, signal ${signal}` : ''}.`);
      log(mainReached ? 'PocketPal main entry was reached. Review the app error above.' : 'No PocketPal main-entry marker was received. Electron may have failed before loading the app.');
      log(`See ${logPath}. To isolate native startup, run this in PowerShell:\n& '${executable.replaceAll("'", "''")}' --version`);
      process.exitCode = 1;
    }
  });
} catch (error) {
  console.error(error.stack || error.message);
  try { fs.appendFileSync(logPath, String(error.stack || error) + '\n'); } catch {}
  process.exitCode = 1;
}
