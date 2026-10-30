@echo off
setlocal
cd /d "%~dp0"
if errorlevel 1 goto failed
echo PocketPal Windows Desktop Pet - separate from browser Picture-in-Picture.
echo Starting from "%CD%"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 22.12 or newer, then reopen this launcher.
  goto failed
)
where npm >nul 2>&1
if errorlevel 1 (
  echo npm was not found. Repair your Node.js installation, then reopen this launcher.
  goto failed
)
if not exist "node_modules\electron\package.json" (
  echo Electron dependencies are missing. In this folder, run: npm install --include=dev
  goto failed
)
call npm run desktop
if errorlevel 1 goto failed
exit /b 0
:failed
echo.
echo PocketPal Desktop Pet could not start. See the error above.
echo If Electron started, more details are in desktop-launch.log in this folder.
pause
exit /b 1
