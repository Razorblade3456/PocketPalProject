# PocketPal Windows companion

The website's **Mini Mochi · Browser** button uses browser Picture-in-Picture. It retains browser-controlled chrome and an opaque canvas; it cannot be a transparent Windows desktop pet. The separate **Transparent Desktop Pet** control pairs with the Electron companion over a loopback-only connection; PocketPal does not launch native executables from the website.

Install dependencies once with `npm install --include=dev`. Double-click **Launch Desktop Pet.cmd** in the project folder, or run `npm run desktop`. Node.js 22.12 or newer is required. The command builds the companion and starts the project-local Electron executable with an absolute entry path; it does not require the website to be running to display the pet. It clears inherited Electron node-only/path overrides. If the Electron binary is missing, its existing downloader uses project-local temporary/cache folders instead of moving files between restricted Windows cache locations. Those download settings are restored before launching the actual Electron app, which uses the normal Windows temporary directory.

The companion is a transparent, frameless, shadow-free window. Drag the pet to move it. Hover to reveal the tiny X; clicking X closes the companion without starting a drag. Click the pet for stats and connection settings. Right-click for **Open PocketPal** or **Close Pet**. Position is remembered and clamped to an available monitor. Only one companion runs at a time.

## One-time pairing and live sync

1. Start PocketPal Desktop with **Launch Desktop Pet.cmd** (or open the portable `PocketPal Desktop.exe`).
2. Click the desktop pet to open its popup, then choose **Connect to PocketPal**. Keep the temporary 10-character code visible; it expires after five minutes.
3. Open PocketPal in Chrome or Edge, choose **Connect Desktop Pet**, and enter that code. Approve the browser's Local Network access prompt if shown.
4. The website sends the selected pet, name, outfit, needs, health stage, motion preference, and current alarm display data. Task history, rewards, notes, and the rest of the save are never sent. The website remains the source of truth.

After pairing, the website sends changed display data promptly and sends an authenticated heartbeat every 12 seconds. The desktop marks the link disconnected after 35 seconds without a heartbeat. Refreshing the tab or restarting the companion reuses the separately stored pairing token. When offline, the pet keeps its last synced appearance and countdown and labels the connection as disconnected. The website tab must stay open for new changes to sync. Countdown rendering continues locally; desktop does not play a second alarm sound. To revoke pairing, use **Disconnect** on the website or **Forget connection** in the desktop popup.

The bridge binds only to `127.0.0.1:47821`, accepts the PocketPal production origin and local Vite origins, uses a short-lived one-time code, stores only the pairing token hash in Electron settings, and validates small versioned display payloads. Chrome/Edge may require Local Network permission. If blocked, allow PocketPal under the browser's site permissions, keep both apps open, and press **Connect Desktop Pet** or **Sync now** again. A used/expired code can be regenerated in the desktop popup.

Manual backup import remains available as a fallback when no website is paired. The imported backup is display-only and is not written into PocketPal.

**Open PocketPal** opens `https://pocketpaltracker.netlify.app/` in the packaged companion. In development it opens `http://127.0.0.1:5173/` (override with `POCKETPAL_DEV_URL`). Normal Windows applications such as Chrome and Excel stay below the pet; Windows secure desktop and system security dialogs cannot be covered.

The portable executable is a single-file x64 Windows build. Build it from Windows with `npm run build:desktop`; output is `release-desktop/PocketPal Desktop.exe`. It includes Electron, ICU data, locales, and the app bundle; receiving PCs need no Node.js or project files. Electron 45 requires 64-bit Windows 10 or later. This project does not currently publish the EXE to a hosted release, so the website's **Download Desktop Pet** remains disabled until `VITE_DESKTOP_DOWNLOAD_URL` points to a real published asset.

Checks: `npm test`, `npm run build`, `npm run desktop:build`, and `npm run build:desktop`. The rebuilt portable EXE was copied outside the project and launched from its temporary extraction directory; its pet renderer and local sync status endpoint loaded without using the source tree or project `node_modules`. This was tested on the development PC, which has Node.js installed, not on a clean no-Node PC. The exact earlier ~238 MB failing executable was not available to inspect or hash, so its specific ICU startup failure cannot be attributed conclusively. The new package includes the Electron distribution's root `icudtl.dat` and has been independently launched; the old file may have been incomplete/corrupted during packaging or transfer, but that remains an inference until its hash or a copy is available. Pairing against the deployed Netlify site and testing on a second physical Windows PC remain manual checks. No cloud service, separate server process, installer, or startup registration is added.

## Transfer and startup diagnostics

Transfer `release-desktop/PocketPal Desktop.exe` itself. On the receiving PC, save it locally (for example in Downloads) and verify the transfer before running:

```powershell
Get-FileHash '.\PocketPal Desktop.exe' -Algorithm SHA256
```

Compare that SHA-256 value with the original laptop's `Get-FileHash` output. Copy the EXE out of Google Drive's browser preview or sync placeholder to a normal local folder before launching. Do not rename, extract, or move any `win-unpacked` file; that is not the portable artifact.

After Electron JavaScript starts, PocketPal writes milestones/errors to `%APPDATA%\pocketpal\startup.log` (Electron version, architecture, Windows version, renderer load, and local bridge start). This log cannot exist if Windows/Electron fails before `desktop/main.cjs` executes. For a repeated ICU error or no startup log, verify the hash first, then check **Event Viewer → Windows Logs → Application** for the matching `PocketPal Desktop.exe` crash and faulting module. Also check **Windows Security → Protection history** for a specific quarantine/block. An unsigned EXE may show a SmartScreen reputation warning; that is separate from an ICU startup crash. Do not disable Defender or SmartScreen.

## If the Windows launcher fails

The command window stays open on failure. Read its actual error; Electron output, OS/architecture, executable path, and native exit codes are also saved to `desktop-launch.log` in the project folder (overwritten on each Electron launch). A successful load of the app entry prints `[PocketPal desktop] main entry reached`. A missing marker plus an unsuccessful `electron.exe --version` indicates a failure before PocketPal's code loads, rather than a pet renderer or file-path error.

Open PowerShell and run:

```powershell
Set-Location 'C:\Users\abrah\OneDrive\Desktop\PocketPalProject'
node --version
npm --version
npm run desktop
Get-Content .\desktop-launch.log
```

If Node/npm is missing, install or repair Node.js 22.12 or newer and reopen PowerShell. If dependencies are missing, run `npm install --include=dev` once, then retry the launcher. No project deletion or reinstall is needed.

For the development launcher only, if its project log shows a native crash before any PocketPal startup message, test Electron itself:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
& '.\node_modules\electron\dist\electron.exe' --version
$LASTEXITCODE
```

If this also crashes, PocketPal's entry file has not run. Check Windows Event Viewer → Windows Logs → Application for the corresponding `electron.exe` error and faulting module, and check Windows Security → Protection history for a specific block. Keep those details and `desktop-launch.log` for diagnosis rather than disabling security or deleting the project.

