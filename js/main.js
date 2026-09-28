// ─────────────────────────────────────────────
//  main.js  —  App bootstrap (entry point)
// ─────────────────────────────────────────────

window.addEventListener('load', async () => {
  // 1. Init shared UI (offline banner, modal wiring)
  UI.initOfflineBanner();
  Utils.on('modal-save-btn',   'click', () => UI.modal.confirm());
  Utils.on('modal-cancel-btn', 'click', () => UI.modal.cancel());

  // 2. Init all screen modules
  LoginScreen.init();
  HomeScreen.init();
  StudentsScreen.init();
  AttendanceScreen.init();
  ProfileScreen.init();
  AdminScreen.init();

  // 3. Hydrate state from localStorage
  const { hasUser, hasStudents, cacheAge } = State.hydrate();

  // 4. Show loading screen while we boot
  Router.go('loading');

  // 5. Load students from Google Sheets
  await _bootStudents(hasStudents, cacheAge);

  // 6. Init Firebase (real-time records sync)
  DB.init();

  // 7. Navigate based on session
  if (hasUser) {
    Router.go('home');
  } else {
    Router.go('login');
  }
});

// ── Student loading strategy ──────────────────
//   • If fresh cache (< 10 min) → use it immediately, refresh in background
//   • If stale cache → show loading, fetch, then proceed
//   • If no cache → show loading, fetch, then proceed
//   • On fetch error → fall back to cache or show empty

const _bootStudents = async (hasCache, cacheAgeMinutes) => {
  const STALE_THRESHOLD = 10; // minutes

  if (hasCache && cacheAgeMinutes < STALE_THRESHOLD) {
    // Fresh cache — use it and silently refresh
    _refreshStudentsInBackground();
    return;
  }

  // Stale or empty — fetch now
  Utils.el('loading-msg').textContent = 'جارٍ تحميل بيانات الأولاد...';
  try {
    const data = await Sheets.loadStudents();
    State.setStudentsData(data);
  } catch (err) {
    console.warn('[Boot] Failed to load students:', err.message);
    if (!hasCache) {
      Utils.el('loading-msg').textContent = 'تعذّر تحميل البيانات — تحقق من الاتصال';
      await new Promise(r => setTimeout(r, 2000)); // let user read the message
    }
    // State already has cache from hydrate() — just continue
  }
};

const _refreshStudentsInBackground = async () => {
  try {
    const data = await Sheets.loadStudents();
    State.setStudentsData(data);
  } catch {
    // Silent fail — cache is still valid
  }
};
