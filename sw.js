// ─────────────────────────────────────────────
//  sw.js  —  Service Worker (offline-first PWA)
//  Version bump here forces cache refresh:
const VERSION = 'v4';
// ─────────────────────────────────────────────

const CACHE_NAME = `church-tracker-${VERSION}`;

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
  './js/ui/servant-attendance.js',
  './js/ui/edit-student.js',
  './js/updater.js',
  './js/main.js',
  './manifest.json',
  './icon.svg',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
];

// ── Install: cache all shell files ───────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_SHELL))
      .then(() => self.skipWaiting()) // activate immediately
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
      .then(() => self.clients.claim()) // take control immediately
  );
});

// ── Message from app: SKIP_WAITING ───────────
// When user confirms update, app sends this message
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Fetch strategy ────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-only: Google APIs (Sheets + Firebase)
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com')
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Cache-first: app shell + Firebase CDN
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response?.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
