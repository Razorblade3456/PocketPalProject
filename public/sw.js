const CACHE = "pocketpal-shell-v11";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      const response = await fetch("./index.html", { cache: "reload" });
      if (!response.ok) throw new Error("App shell unavailable");
      const html = await response.clone().text();
      const assets = [
        ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
      ].map((match) => new URL(match[1], self.registration.scope).href);
      await cache.addAll(assets);
      await cache.put("./index.html", response);
    }),
  );
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("pocketpal-shell-") && key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(() => caches.match("./index.html")),
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(CACHE)
                .then((cache) => cache.put(event.request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
