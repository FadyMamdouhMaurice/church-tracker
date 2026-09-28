// ─────────────────────────────────────────────
//  sw.js  —  Service Worker (offline-first PWA)
// ─────────────────────────────────────────────

const CACHE_NAME  = 'church-tracker-v1';
const CACHE_SHELL = [
  './',
  './index.html',
  './css/app.css',
  './js/config.js',
  './js/utils.js',
  './js/state.js',
  './js/router.js',
  './js/ui.js',
  './js/db.js',
  './js/sheets.js',
  './js/ui/login.js',
  './js/ui/home.js',
  './js/ui/students.js',
  './js/ui/attendance.js',
  './js/ui/profile.js',
  './js/ui/admin.js',
  './js/main.js',
  // Firebase CDN
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
];

// ── Install: cache all shell files ───────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ──────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for shell, network-first for API ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Apps Script calls — network only (no cache)
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Firebase calls — network only
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('google.com/v1')) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // App shell + CDN — cache first, fallback to network
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }))
      .catch(() => caches.match('./index.html'))
  );
});
