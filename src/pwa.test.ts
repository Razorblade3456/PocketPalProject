import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";
test("PWA manifest, icons and precached production assets are complete", () => {
  const manifest = JSON.parse(
    readFileSync("dist/manifest.webmanifest", "utf8"),
  );
  assert.equal(manifest.name, "PocketPal");
  assert.equal(manifest.display, "standalone");
  for (const [file, size] of [
    ["icon-192.png", 192],
    ["icon-512.png", 512],
    ["apple-touch-icon.png", 180],
  ] as const) {
    const png = readFileSync(`dist/${file}`);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  const sw = readFileSync("dist/sw.js", "utf8");
  assert.ok(!sw.includes("__BUILD__"));
  assert.ok(!sw.includes("__ASSETS__"));
  const assets = JSON.parse(sw.match(/const ASSETS = (.*);/)![1]);
  assert.ok(assets.includes("./index.html"));
  assert.ok(assets.some((a: string) => a.endsWith(".js")));
  assert.ok(assets.some((a: string) => a.endsWith(".css")));
  for (const asset of assets) assert.ok(existsSync(`dist/${asset}`), asset);
});
test("worker caches offline shell and only activates update on request", async () => {
  const listeners: Record<string, Function> = {};
  let skipped = 0;
  let cached: string[] = [];
  let response: Promise<unknown> | undefined;
  const shell = { html: "cached shell" };
  const self = {
    location: { origin: "https://example.test" },
    registration: { scope: "https://example.test/" },
    clients: { claim: async () => {} },
    skipWaiting: () => skipped++,
    addEventListener: (name: string, fn: Function) => (listeners[name] = fn),
  };
  const caches = {
    open: async () => ({
      addAll: async (a: string[]) => {
        cached = a;
      },
      match: async () => shell,
    }),
    keys: async () => [],
    delete: async () => true,
  };
  vm.runInNewContext(readFileSync("dist/sw.js", "utf8"), {
    self,
    caches,
    URL,
    fetch: () => {
      throw Error("offline");
    },
  });
  await new Promise<void>((resolve, reject) =>
    listeners.install({
      waitUntil: (p: Promise<void>) => p.then(resolve, reject),
    }),
  );
  assert.ok(cached.includes("./index.html"));
  assert.equal(skipped, 0);
  listeners.fetch({
    request: { method: "GET", url: "https://example.test/", mode: "navigate" },
    respondWith: (p: Promise<unknown>) => (response = p),
  });
  assert.deepEqual(await response, shell);
  listeners.message({ data: { type: "SKIP_WAITING" } });
  assert.equal(skipped, 1);
});
