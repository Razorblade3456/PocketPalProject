// Keep the Windows launcher independent of the caller's working directory/PATH.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const logPath = path.join(root, 'desktop-launch.log');
function log(message) { console.error(message); fs.appendFileSync(logPath, message + '\n'); }
try {
  fs.writeFileSync(logPath, `PocketPal Desktop Pet · ${new Date().toISOString()}\nNode ${process.version}\nProject: ${root}\n`);
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12)) throw Error('Node.js 22.12 or newer is required.');
  // Electron's downloader can fail when moving between Windows sandbox temp/cache locations.
  // Use local writable cache/temp folders only if its binary needs downloading.
  process.env.electron_config_cache = path.join(root, 'node_modules', '.electron-cache');
  process.env.TEMP = path.join(root, 'node_modules', '.electron-temp');
  fs.mkdirSync(process.env.TEMP, { recursive: true });
  delete process.env.ELECTRON_RUN_AS_NODE;
  delete process.env.ELECTRON_OVERRIDE_DIST_PATH;
  const executable = require('electron');
  const entry = path.join(__dirname, 'main.cjs');
  if (!fs.existsSync(path.join(root, 'dist-desktop', 'companion.html'))) throw Error('Companion build is missing. Run npm run desktop:build first.');
  log(`Starting: ${executable}\nEntry: ${entry}`);
  const child = spawn(executable, [entry], { cwd: root, env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }, stdio: ['inherit', 'pipe', 'pipe'], windowsHide: true });
  child.stdout.on('data', data => { process.stdout.write(data); fs.appendFileSync(logPath, data); });
  child.stderr.on('data', data => { process.stderr.write(data); fs.appendFileSync(logPath, data); });
  child.on('error', error => { log(`Electron could not be started: ${error.message}`); process.exitCode = 1; });
  child.on('exit', (code, signal) => {
    if (code !== 0) {
      const hex = typeof code === 'number' ? ` (0x${(code >>> 0).toString(16).toUpperCase()})` : '';
      log(`Electron exited with code ${code}${hex}${signal ? `, signal ${signal}` : ''}.`);
      log(`See ${logPath}. If no app error appears, Electron failed before PocketPal started.`);
      process.exitCode = 1;
    }
  });
} catch (error) {
  console.error(error.stack || error.message);
  try { fs.appendFileSync(logPath, String(error.stack || error) + '\n'); } catch {}
  process.exitCode = 1;
}
