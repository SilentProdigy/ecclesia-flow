const VERSION = "ecclesia-flow-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),

      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) =>
              key.startsWith("ecclesia-flow-")
            )
            .filter((key) => key !== VERSION)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});