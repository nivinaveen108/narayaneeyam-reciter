const CACHE_NAME = "narayaneeyam-shell-v1";
const AUDIO_CACHE = "narayaneeyam-audio-v1";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./data/dashakams_index.json",
  "./data/dashakam_01.json"
];

// 1. Install Event: Cache Core App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Cleanup Stale Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== AUDIO_CACHE) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Strategy
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (such as POST calls to Google Apps Script)
  if (event.request.method !== "GET") {
    return;
  }

  // Bypass external APIs and analytics entirely to prevent service worker fetch rejections
  if (
    url.origin.includes("script.google.com") ||
    url.origin.includes("googletagmanager.com") ||
    url.origin.includes("google-analytics.com")
  ) {
    return;
  }

  // Audio files (.mp3 from FileDN): Handle 200, 206 Partial Content, and opaque responses
  if (url.pathname.endsWith(".mp3")) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(event.request);
          if (
            networkResponse &&
            (networkResponse.status === 200 ||
              networkResponse.status === 206 ||
              networkResponse.type === "opaque")
          ) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          if (cachedResponse) return cachedResponse;
          throw err;
        }
      })
    );
    return;
  }

  // Google Fonts: Stale-While-Revalidate
  if (url.origin.includes("fonts.googleapis.com") || url.origin.includes("fonts.gstatic.com")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request)
          .then((networkRes) => {
            if (networkRes && (networkRes.status === 200 || networkRes.type === "opaque")) {
              cache.put(event.request, networkRes.clone());
            }
            return networkRes;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Standard App Assets & JSON files: Cache First, fallback to Network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && (response.status === 200 || response.type === "opaque")) {
          const respClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
        }
        return response;
      });
    })
  );
});