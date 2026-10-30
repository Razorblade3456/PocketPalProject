# Tiny Windows companion

Install dependencies once with `npm install --include=dev`. Double-click **Launch Desktop Pet.cmd** in the project folder, or run `npm run desktop`. Node.js 22.12 or newer is required. The command builds the companion and starts the project-local Electron executable with an absolute entry path; it does not require the website to be running to display the pet. It clears inherited Electron node-only/path overrides. If the Electron binary is missing, its existing downloader uses project-local temporary/cache folders instead of moving files between restricted Windows cache locations.

The companion is a transparent, frameless, shadow-free 100×100 window. Drag the pet to move it. Hover to reveal the tiny X; clicking X closes the companion without starting a drag. Click the pet for the existing stats and companion selection. Click outside the popup to dismiss. Right-click for **Open PocketPal** or **Close Pet**. Position is remembered and clamped to an available monitor. Only one companion runs at a time.

Browser storage is not shared with Electron. Without a save, the pet uses its existing default artwork and shows no invented stats. Choose Mochi, Pippin, or Crumb in the popup. Optionally export a backup from PocketPal and use **Load saved stats…**. This displays the actual saved pet, outfit, needs and health stage as a labeled snapshot; it does not simulate decay, write back to the website, or claim live synchronization. Load a newer export to refresh. The snapshot and position are kept in Electron's user-data folder.

**Open PocketPal** opens the existing local website at `http://127.0.0.1:5174/#`; start your usual website server first. Normal Windows applications such as Chrome and Excel stay below the pet; Windows secure desktop and system security dialogs cannot be covered.

Checks: `npm test`, `npm run build`, `npm run desktop:build`. Manual Windows checks: all three pets, idle motion, drag versus click, popup dismissal, right-click actions, position after restart, monitor removal, valid/invalid backups, and restored snapshot. No installer, background service, startup registration, or backend is added.

## If the Windows launcher fails

The command window now stays open on failure. Read its actual error; Electron output and native exit codes are also saved to `desktop-launch.log` in the project folder (overwritten on each Electron launch).

Open PowerShell and run:

```powershell
Set-Location 'C:\Users\abrah\OneDrive\Desktop\PocketPalProject'
node --version
npm --version
npm run desktop
Get-Content .\desktop-launch.log
```

If Node/npm is missing, install or repair Node.js 22.12 or newer and reopen PowerShell. If dependencies are missing, run `npm install --include=dev` once, then retry the launcher. No project deletion or reinstall is needed.

If the log shows a native crash before any PocketPal startup message, test Electron itself:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
& '.\node_modules\electron\dist\electron.exe' --version
$LASTEXITCODE
```

If this also crashes, PocketPal's entry file has not run. Check Windows Event Viewer → Windows Logs → Application for the corresponding `electron.exe` error and faulting module, and check Windows Security → Protection history for a specific block. Keep those details and `desktop-launch.log` for diagnosis rather than disabling security or deleting the project.

Verification in the managed development environment: both builds and JavaScript syntax checks passed. Electron itself exited before app startup with `0x80000003`; transparency, dragging, hover-close and restart position still require testing outside that environment.
