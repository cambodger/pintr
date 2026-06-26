// Minimal service worker — its ONLY job is to make pintr installable.
//
// Chrome won't fire `beforeinstallprompt` (the one-tap "Install" flow) unless
// the app registers a service worker that has a fetch handler. We don't cache
// anything yet — offline support and web push are v1.5 (see README/SPEC §7) —
// so this handler is a deliberate network passthrough: it exists to satisfy
// the installability criteria and nothing more. No caching = no stale-content
// surprises while the app is still changing fast.

self.addEventListener("install", () => {
  // Activate this SW immediately instead of waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally empty: let the browser handle every request from the network
  // as normal. Having *a* fetch handler is what makes the PWA installable.
});
