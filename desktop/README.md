# Tiny Windows companion

Install dependencies once with `npm install`. Double-click **Launch Desktop Pet.cmd** in the project folder, or run `npm run desktop`. Node.js 22.12 or newer is required. The command builds the companion and starts Electron; it does not require the website to be running to display the pet.

Drag the pet to move it. Click for stats and companion selection. Click outside the popup to dismiss. Right-click for **Open PocketPal** or **Close Pet**. Position is remembered and clamped to an available monitor. Only one companion runs at a time.

Browser storage is not shared with Electron. Without a save, the pet uses its existing default artwork and shows no invented stats. Choose Mochi, Pippin, or Crumb in the popup. Optionally export a backup from PocketPal and use **Load saved stats…**. This displays the actual saved pet, outfit, needs and health stage as a labeled snapshot; it does not simulate decay, write back to the website, or claim live synchronization. Load a newer export to refresh. The snapshot and position are kept in Electron's user-data folder.

**Open PocketPal** opens the existing local website at `http://127.0.0.1:5174/#`; start your usual website server first. Normal Windows applications such as Chrome and Excel stay below the pet; Windows secure desktop and system security dialogs cannot be covered.

Checks: `npm test`, `npm run build`, `npm run desktop:build`. Manual Windows checks: all three pets, idle motion, drag versus click, popup dismissal, right-click actions, position after restart, monitor removal, valid/invalid backups, and restored snapshot. No installer, background service, startup registration, or backend is added.
