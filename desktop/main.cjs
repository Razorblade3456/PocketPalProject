const { app, BrowserWindow, ipcMain, Menu, shell, screen, dialog } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
let pet, popup, settings = {}, settingsPath;
const page = path.join(__dirname, '../dist-desktop/companion.html');
function save() {
  try { fs.writeFileSync(settingsPath, JSON.stringify(settings)); } catch (error) { console.error('Could not save companion position:', error.message); }
}
function position(x, y) {
  const area = screen.getDisplayNearestPoint({ x, y }).workArea;
  return { x: Math.round(Math.max(area.x, Math.min(x, area.x + area.width - 80))), y: Math.round(Math.max(area.y, Math.min(y, area.y + area.height - 80))) };
}
function closePopup() { if (popup && !popup.isDestroyed()) popup.close(); popup = null; }
function showPopup() {
  if (popup) { closePopup(); return; }
  const bounds = pet.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  popup = new BrowserWindow({ width: 250, height: 330, x: Math.max(area.x, Math.min(bounds.x, area.x + area.width - 250)), y: bounds.y >= area.y + 330 ? bounds.y - 330 : Math.min(bounds.y + 80, area.y + area.height - 330), frame: false, resizable: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
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
app.whenReady().then(() => {
  settingsPath = path.join(app.getPath('userData'), 'desktop-pet.json');
  try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch {}
  const area = screen.getPrimaryDisplay().workArea;
  const initial = position(Number.isFinite(settings.x) ? settings.x : area.x + area.width - 120, Number.isFinite(settings.y) ? settings.y : area.y + area.height - 120);
  pet = new BrowserWindow({ ...initial, width: 80, height: 80, transparent: true, backgroundColor: '#00000000', frame: false, resizable: false, maximizable: false, fullscreenable: false, hasShadow: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  pet.setAlwaysOnTop(true, 'screen-saver');
  pet.webContents.setFrameRate(30);
  pet.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  pet.webContents.on('will-navigate', event => event.preventDefault());
  pet.loadFile(page);
  pet.on('moved', () => { Object.assign(settings, pet.getPosition().reduce((p, v, i) => ({ ...p, [i ? 'y' : 'x']: v }), {})); });
  pet.on('close', save);
  screen.on('display-removed', () => { const p = position(...pet.getPosition()); pet.setPosition(p.x, p.y); });
});
const trusted = event => [pet, popup].some(w => w && !w.isDestroyed() && w.webContents === event.sender);
ipcMain.handle('pet:settings', event => trusted(event) ? settings : {});
ipcMain.handle('pet:select', (event, kind) => {
  if (!trusted(event) || !['mochi', 'pippin', 'crumb'].includes(kind)) return;
  settings.kind = kind; save(); pet.webContents.send('pet:changed');
});
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
ipcMain.on('pet:popup', event => { if (trusted(event)) showPopup(); });
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
  Menu.buildFromTemplate([{ label: 'Open PocketPal', click: () => shell.openExternal('http://127.0.0.1:5174/#') }, { label: 'Close Pet', click: () => app.quit() }]).popup({ window: pet });
});
app.on('window-all-closed', () => app.quit());
}
