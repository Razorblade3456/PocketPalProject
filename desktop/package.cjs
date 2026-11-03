// Keep Windows build downloads/cache/temp on the same writable project volume.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const temp = path.join(root, "node_modules", ".desktop-build-temp");
const cache = path.join(root, "node_modules", ".desktop-builder-cache");
for (const directory of [temp, cache])
  fs.mkdirSync(directory, { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    require.resolve("electron-builder/cli.js"),
    "--config",
    "electron-builder.json",
    "--win",
    "portable",
    "--x64",
    "--publish",
    "never",
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      TEMP: temp,
      TMP: temp,
      ELECTRON_BUILDER_CACHE: cache,
    },
    stdio: "inherit",
    windowsHide: true,
  },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
