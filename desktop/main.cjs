console.log('[PocketPal desktop] main entry reached');
const { app, BrowserWindow, ipcMain, Menu, shell, screen, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { createSyncBridge } = require('./syncBridge.cjs');
let pet, popup, settings = {}, settingsPath;
let syncBridge, syncError = '';
const PET_NAMES = { mochi: "Mochi", pippin: "Pippin", crumb: "Crumb", rattle: "Rattle" };
const PET_SIZE = 160;
const PET_HEIGHT = 168;
const TIMER_HEIGHT = 226;
const page = path.join(__dirname, '../dist-desktop/companion.html');
function save() {
  try { fs.writeFileSync(settingsPath, JSON.stringify(settings)); } catch (error) { console.error('Could not save companion position:', error.message); }
}
function position(x, y) {
  const area = screen.getDisplayNearestPoint({ x, y }).workArea;
  const { width, height } = pet && !pet.isDestroyed() ? pet.getBounds() : { width: PET_SIZE, height: PET_HEIGHT };
  return { x: Math.round(Math.max(area.x, Math.min(x, area.x + area.width - width))), y: Math.round(Math.max(area.y, Math.min(y, area.y + area.height - height))) };
}
function closePopup() { if (popup && !popup.isDestroyed()) popup.close(); popup = null; }
function showPopup() {
  if (popup) { closePopup(); return; }
  const bounds = pet.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  popup = new BrowserWindow({ width: 250, height: 330, x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - 250)), y: bounds.y >= area.y + 330 ? bounds.y - 330 : Math.min(bounds.y + bounds.height, area.y + area.height - 330), frame: false, resizable: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  popup.setAlwaysOnTop(true, 'screen-saver');
  popup.loadFile(page, { query: { popup: '1' } });
  popup.on('blur', closePopup);
  popup.on('closed', () => { popup = null; });
  popup.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  popup.webContents.on('will-navigate', event => event.preventDefault());
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
app.on('second-instance', () => { pet?.show(); });
app.whenReady().then(async () => {
  settingsPath = path.join(app.getPath('userData'), 'desktop-pet.json');
  // The development launcher used Electron's default profile. Read its existing
  // companion settings on the first packaged launch; never move/delete that file.
  const source = app.isPackaged && !fs.existsSync(settingsPath)
    ? path.join(app.getPath('appData'), 'Electron', 'desktop-pet.json') : settingsPath;
  try { settings = JSON.parse(fs.readFileSync(source, 'utf8')); } catch {}
  syncBridge = createSyncBridge({ settings, persist: () => { save(); for (const w of [pet, popup]) if (w && !w.isDestroyed()) w.webContents.send('pet:changed'); } });
  try { await syncBridge.start(); }
  catch (error) { syncError = `Local sync could not start (${error.code || error.message}). Close any second companion and restart PocketPal Desktop.`; console.error('[PocketPal desktop] local sync bridge failed:', error.message); }
  const area = screen.getPrimaryDisplay().workArea;
  const initial = position(Number.isFinite(settings.x) ? settings.x : area.x + area.width - 120, Number.isFinite(settings.y) ? settings.y : area.y + area.height - 120);
  pet = new BrowserWindow({ ...initial, width: PET_SIZE, height: PET_HEIGHT, transparent: true, backgroundColor: '#00000000', frame: false, resizable: false, maximizable: false, fullscreenable: false, hasShadow: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  pet.setAlwaysOnTop(true, 'screen-saver');
  pet.webContents.setFrameRate(30);
  pet.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  pet.webContents.on('will-navigate', event => event.preventDefault());
  pet.webContents.on('render-process-gone', (_event, details) => {
    console.error('Desktop pet renderer stopped:', details);
    dialog.showErrorBox('PocketPal Desktop Pet', `The pet renderer stopped: ${details.reason} (${details.exitCode}). See desktop-launch.log.`);
    app.exit(1);
  });
  await pet.loadFile(page);
  pet.on('moved', () => { Object.assign(settings, pet.getPosition().reduce((p, v, i) => ({ ...p, [i ? 'y' : 'x']: v }), {})); });
  pet.on('close', save);
  screen.on('display-removed', () => { const p = position(...pet.getPosition()); pet.setPosition(p.x, p.y); });
}).catch(error => {
  console.error('Desktop pet startup failed:', error);
  dialog.showErrorBox('PocketPal Desktop Pet could not start', error.stack || error.message);
  app.exit(1);
});
const trusted = event => [pet, popup].some(w => w && !w.isDestroyed() && w.webContents === event.sender);
ipcMain.handle('pet:settings', event => trusted(event) ? ({ kind: settings.kind, snapshot: settings.snapshot, liveSync: settings.liveSync }) : {});
ipcMain.handle('pet:sync-status', event => trusted(event) ? { ...syncBridge?.status(), error: syncError } : null);
ipcMain.handle('pet:pair-begin', event => trusted(event) && popup && !popup.isDestroyed() ? syncBridge?.beginPairing() : null);
ipcMain.handle('pet:pair-forget', event => {
  if (!trusted(event)) return;
  delete settings.pairTokenHash;
  save();
  for (const w of [pet,popup]) if (w && !w.isDestroyed()) w.webContents.send('pet:changed');
});
function selectPet(kind) {
  if (typeof kind !== "string" || !Object.hasOwn(PET_NAMES, kind)) return;
  settings.kind = kind; save();
  for (const window of [pet,popup]) if (window && !window.isDestroyed()) window.webContents.send('pet:changed');
}
ipcMain.handle('pet:select', (event, kind) => { if (trusted(event)) selectPet(kind); });
ipcMain.handle('pet:import', async event => {
  if (!trusted(event)) return null;
  // Keep the popup alive while the native file picker owns focus.
  popup?.removeListener('blur', closePopup);
  const result = await dialog.showOpenDialog(popup || pet, { title: 'Load a PocketPal exported backup', filters: [{ name: 'PocketPal backup', extensions: ['json'] }], properties: ['openFile'] });
  popup?.on('blur', closePopup);
  if (result.canceled) return null;
  try {
    if (fs.statSync(result.filePaths[0]).size > 10000000) throw Error('Backup is too large.');
    return fs.readFileSync(result.filePaths[0], 'utf8');
  } catch (error) { return { error: error.message }; }
});
ipcMain.handle('pet:snapshot', (event, value) => {
  if (!trusted(event) || typeof value !== 'string' || value.length > 10000000) return;
  settings.snapshot = value; save(); pet.webContents.send('pet:changed');
});
ipcMain.on('pet:timer-visible', (event, visible) => {
  if (event.sender !== pet?.webContents || typeof visible !== 'boolean') return;
  const height = visible ? TIMER_HEIGHT : PET_HEIGHT;
  if (pet.getContentBounds().height === height) return;
  pet.setContentSize(PET_SIZE, height);
  const p = position(...pet.getPosition());
  pet.setPosition(p.x, p.y);
});
ipcMain.on('pet:popup', event => { if (trusted(event)) showPopup(); });
ipcMain.on('pet:close', event => { if (trusted(event)) app.quit(); });
let drag;
ipcMain.on('pet:drag', (event, action) => {
  if (event.sender !== pet?.webContents) return;
  const cursor = screen.getCursorScreenPoint();
  if (action === 'start') { closePopup(); const [x,y] = pet.getPosition(); drag = { x: cursor.x - x, y: cursor.y - y }; }
  if (action === 'move' && drag) { const p = position(cursor.x - drag.x, cursor.y - drag.y); pet.setPosition(p.x, p.y); }
  if (action === 'end') { drag = null; const [x,y] = pet.getPosition(); Object.assign(settings, {x,y}); save(); }
});
ipcMain.on('pet:menu', event => {
  if (!trusted(event)) return;
  closePopup();
  Menu.buildFromTemplate([{ label: 'Change Pet', submenu: Object.entries(PET_NAMES).map(([kind,label]) => ({ label, type:'radio', checked:kind === (settings.kind || (()=>{try{return JSON.parse(settings.snapshot || '{}').pet;}catch{return undefined;}})() || 'mochi'), click:()=>selectPet(kind) })) }, { type:'separator' }, { label: 'Open PocketPal', click: () => shell.openExternal(app.isPackaged ? 'https://pocketpaltracker.netlify.app/' : (process.env.POCKETPAL_DEV_URL || 'http://127.0.0.1:5173/')) }, { label: 'Close Pet', click: () => app.quit() }]).popup({ window: pet });
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { syncBridge?.stop(); });
}
