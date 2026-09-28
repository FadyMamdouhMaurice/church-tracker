// ─────────────────────────────────────────────
//  main.js  —  App bootstrap
// ─────────────────────────────────────────────

window.addEventListener('load', async () => {

  // 1. Register Service Worker (enables offline)
  _registerSW();

  // 2. Init shared UI
  UI.initOfflineBanner();
  Utils.on('modal-save-btn',   'click', () => UI.modal.confirm());
  Utils.on('modal-cancel-btn', 'click', () => UI.modal.cancel());

  // 3. Init all screen modules
  LoginScreen.init();
  HomeScreen.init();
  StudentsScreen.init();
  AttendanceScreen.init();
  ProfileScreen.init();
  AdminScreen.init();

  // 4. Hydrate state from localStorage
  const { hasUser, hasStudents, cacheAge } = State.hydrate();

  // 5. Show loading screen
  Router.go('loading');

  // 6. Load students (respects offline)
  await _bootStudents(hasStudents, cacheAge);

  // 7. Init Firebase
  DB.init();

  // 8. Navigate
  Router.go(hasUser ? 'home' : 'login');
});

// ── Service Worker ────────────────────────────
const _registerSW = () => {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js')
    .then(reg => {
      // Check for updates in background
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW?.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — show subtle hint
            UI.toast('📲 تحديث جديد متاح — أعد تحميل الصفحة');
          }
        });
      });
    })
    .catch(err => console.warn('[SW] Registration failed:', err));
};

// ── Student loading strategy ──────────────────
//
//  Case 1 — Fresh cache (< 10 min):
//    → Use cache immediately, refresh in background
//
//  Case 2 — Stale cache + online:
//    → Fetch from Sheets, update cache, proceed
//
//  Case 3 — Stale cache + offline:
//    → Use stale cache, show warning toast
//
//  Case 4 — No cache + online:
//    → Fetch from Sheets
//
//  Case 5 — No cache + offline:
//    → Show "no data" message, wait

const _bootStudents = async (hasCache, cacheAgeMin) => {
  const FRESH_THRESHOLD = 10; // minutes

  if (hasCache && cacheAgeMin < FRESH_THRESHOLD) {
    // Case 1: fresh cache
    _refreshInBackground();
    return;
  }

  if (hasCache && !navigator.onLine) {
    // Case 3: stale but offline — use it with warning
    UI.toast('⚠️ لا يوجد اتصال — بيانات قد تكون غير محدثة');
    return;
  }

  if (!hasCache && !navigator.onLine) {
    // Case 5: nothing at all — can't do much
    Utils.el('loading-msg').textContent = 'لا يوجد اتصال ولا بيانات محفوظة';
    await _waitForConnection();
  }

  // Cases 2 & 4: fetch now
  Utils.el('loading-msg').textContent = 'جارٍ تحميل البيانات...';
  try {
    const data = await Sheets.loadStudents();
    State.setStudentsData(data);
  } catch (err) {
    console.warn('[Boot] Sheets fetch failed:', err.message);
    if (!hasCache) {
      Utils.el('loading-msg').textContent = 'تعذّر تحميل البيانات — تحقق من الاتصال';
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};

const _refreshInBackground = async () => {
  try {
    const data = await Sheets.loadStudents();
    State.setStudentsData(data);
  } catch { /* silent — cache is still valid */ }
};

// Wait until online (max 30 seconds)
const _waitForConnection = () => new Promise(resolve => {
  if (navigator.onLine) { resolve(); return; }
  const onOnline = () => { window.removeEventListener('online', onOnline); resolve(); };
  window.addEventListener('online', onOnline);
  setTimeout(resolve, 30_000);
});
