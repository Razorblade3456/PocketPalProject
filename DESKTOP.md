# PocketPal portable desktop companion

Build from the project folder with Node/npm installed:

`npm run build:desktop`

Output: `release-desktop/PocketPal Desktop.exe` (Windows x64).
Copy that one EXE anywhere and double-click it. The destination PC does not need Node.js, npm, VS Code, source files, or the win-unpacked folder. The EXE contains Electron and the existing compiled companion. It is an unsigned build using the default Electron executable icon.

Right-click the pet → Change Pet → Mochi, Pippin, Crumb, or Rattle (the existing skull pet). The choice is a local desktop display preference. It overrides the imported snapshot's character without changing its care stats, inventory, coins, tasks, outfits, or alarms, and survives restarts.

Desktop settings use the app's normal userData folder, typically %APPDATA%/pocketpal/desktop-pet.json. On the first packaged launch, existing desktop-pet.json from the development launcher's Electron profile is read if the new settings file is absent; the original file is never moved or deleted. Imported alarm snapshots still require a fresh export/import to receive website changes. No new sync or backend is added.

Calendar editing: choose a date, expand its tasks, then click Edit or Edit series. This opens the existing task editor using the original task ID. Edit series changes the whole recurring series; deleted historical tasks remain read-only.

Build configuration: electron-builder.json. The small desktop/package.cjs wrapper keeps build downloads and temporary files inside node_modules to avoid Windows sandbox cache-move failures. Packaging uses electron-builder's portable target: https://www.electron.build/docs/win/

Files changed for this update: package.json, package-lock.json, electron-builder.json, desktop/package.cjs, desktop/main.cjs, desktop/companion.test.cjs, src/DesktopPet.tsx, src/TaskCalendar.tsx, src/App.tsx, src/taskCalendar.css, src/taskCalendar.test.ts, vite.config.ts, .gitignore, and this file.
