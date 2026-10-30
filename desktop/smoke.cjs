// Run with: node_modules\.bin\electron desktop/smoke.cjs
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pocketpal-desktop-check-'));
app.setPath('userData', dir);
require('./main.cjs');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) { for (let i=0;i<100;i++) { if(await check()) return; await wait(100); } throw Error('Timed out'); }
app.whenReady().then(async () => {
  try {
    const pet = BrowserWindow.getAllWindows()[0];
    await until(() => pet.webContents.executeJavaScript('!!document.querySelector(".pet-art")'));
    assert.equal(pet.isAlwaysOnTop(), true);
    assert.deepEqual(pet.getSize(), [80,80]);
    assert.equal(pet.getBackgroundColor(), '#00000000');
    for (const kind of ['mochi','pippin','crumb']) {
      await pet.webContents.executeJavaScript(`window.desktopPet.select('${kind}')`);
      await until(() => pet.webContents.executeJavaScript(`!!document.querySelector('.species-${kind} .pet-art')`));
    }
    await pet.webContents.executeJavaScript('window.desktopPet.popup()');
    await until(() => BrowserWindow.getAllWindows().length === 2);
    const popup = BrowserWindow.getAllWindows().find(w => w !== pet);
    await until(() => popup.webContents.executeJavaScript('!!document.querySelector("select")'));
    assert.equal(await popup.webContents.executeJavaScript('document.querySelectorAll("progress").length'),0);
    pet.focus();
    await until(() => BrowserWindow.getAllWindows().length === 1);
    await pet.webContents.executeJavaScript('window.desktopPet.drag("start");window.desktopPet.drag("move");window.desktopPet.drag("end")');
    await until(() => fs.existsSync(path.join(dir,'desktop-pet.json')));
    const saved = JSON.parse(fs.readFileSync(path.join(dir,'desktop-pet.json')));
    assert.equal(saved.kind,'crumb');
    assert.equal(Number.isFinite(saved.x) && Number.isFinite(saved.y),true);
    console.log('PASS: transparent 80×80 window, always-on-top, three pets, no invented stats, popup dismissal, drag IPC and persisted position.');
    app.quit();
  } catch(error) { console.error(error); app.exit(1); }
});
