// ─────────────────────────────────────────────
//  main.js  —  App bootstrap
// ─────────────────────────────────────────────

window.addEventListener('load', async () => {

  // 1. Register Service Worker + update detection
  _registerSW();
  Updater.init();

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
  ServantAttendanceScreen.init();
  MassAttendanceScreen.init();
  EditStudentScreen.init();

  // 4. Hydrate state from localStorage
  const { hasUser, hasStudents, cacheAge } = State.hydrate();

  // 5. Show loading screen
  Router.go('loading');

  // 6. Load students
  await _bootStudents(hasStudents, cacheAge);

  // 7. Flush any pending offline writes
  const pending = DB.init();

  // 8. Navigate
  Router.go(hasUser ? 'home' : 'login');
});

// ── Service Worker ────────────────────────────
const _registerSW = () => {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js')
    .catch(err => console.warn('[SW] Registration failed:', err));
};

// ── Student loading strategy ──────────────────
const _bootStudents = async (hasCache, cacheAgeMin) => {
  const FRESH = 10; // minutes

  if (hasCache && cacheAgeMin < FRESH) {
    // Fresh cache — use immediately, refresh silently
    _refreshInBackground();
    return;
  }

  if (hasCache && !navigator.onLine) {
    // Stale but offline — use cache, show pending writes count
    _showOfflineStatus();
    return;
  }

  if (!hasCache && !navigator.onLine) {
    // Nothing at all
    _showOfflineStatus();
    await _waitForConnection();
  }

  // Fetch from Sheets
  _setLoadingMsg('جارٍ تحميل البيانات...');
  try {
    const data = await Sheets.loadStudents();
    State.setStudentsData(data);
  } catch (err) {
    console.warn('[Boot] Sheets fetch failed:', err.message);
    if (!hasCache) {
      _setLoadingMsg('تعذّر تحميل البيانات — تحقق من الاتصال');
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};

// Show offline status with pending count
const _showOfflineStatus = () => {
  const pending = State.store.get('ct_queue', []).length;
  const students = State.get('students')?.length ?? 0;

  _setLoadingMsg(
    pending > 0
      ? `📴 غير متصل — جارٍ تحميل ${students} ولد من الذاكرة...\n⏳ ${pending} سجل ينتظر المزامنة`
      : `📴 غير متصل — جارٍ تحميل ${students} ولد من الذاكرة...`
  );
};

const _setLoadingMsg = (msg) => {
  const el = Utils.el('loading-msg');
  if (el) el.innerHTML = msg.replace('\n', '<br>');
};

const _refreshInBackground = async () => {
  try {
    const data = await Sheets.loadStudents();
    State.setStudentsData(data);
  } catch { /* silent */ }
};

const _waitForConnection = () => new Promise(resolve => {
  if (navigator.onLine) { resolve(); return; }
  const onOnline = () => { window.removeEventListener('online', onOnline); resolve(); };
  window.addEventListener('online', onOnline);
  setTimeout(resolve, 30_000);
});
