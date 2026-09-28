// ─────────────────────────────────────────────
//  db.js  —  Firebase Firestore + offline queue
// ─────────────────────────────────────────────

const DB = (() => {
  let _db        = null;
  let _unsubscribe = null;
  let _ready     = false;

  // ── Init ──────────────────────────────────
  const init = () => {
    try {
      if (!firebase.apps.length) firebase.initializeApp(CONFIG.firebase);
      _db    = firebase.firestore();
      _ready = true;
      _startListener();
      _flushQueue();
    } catch (err) {
      console.warn('[DB] Firebase init failed:', err.message);
      _ready = false;
      // Load from cache so the app still works
      const cached = State.store.get(CONFIG.cache.records, []);
      State.setRecords(cached);
      _updateStatus('🔴 Firebase غير متاح — البيانات محلية فقط');
    }
  };

  // ── Real-time listener ────────────────────
  const _startListener = () => {
    if (_unsubscribe) _unsubscribe();
    _unsubscribe = _db.collection('records')
      .orderBy('date', 'desc')
      .onSnapshot(
        (snap) => {
          const records = snap.docs.map(d => ({ fsId: d.id, ...d.data() }));
          State.setRecords(records);
          _updateStatus(`🟢 Firebase متصل — ${records.length} سجل`);
        },
        (err) => {
          const cached = State.store.get(CONFIG.cache.records, []);
          State.setRecords(cached);
          const msg = (err?.code === 'permission-denied' || err?.code === 'failed-precondition')
            ? '🔴 فعّل Firestore من Firebase Console'
            : `🔴 غير متصل — ${cached.length} سجل محلي`;
          _updateStatus(msg);
        }
      );
  };

  // ── Write (online + offline fallback) ─────
  const write = async (record) => {
    const full = {
      ...record,
      by:        State.get('user').displayName,
      classId:   State.get('user').classId,
      createdAt: new Date().toISOString(),
    };

    // Optimistic local update
    State.addRecord(full);

    // Sync to Sheets (fire-and-forget)
    Sheets.syncRecord(full);

    if (!_ready || !navigator.onLine) {
      _enqueue(full);
      return;
    }

    try {
      await _db.collection('records').add(full);
    } catch {
      _enqueue(full);
    }
  };

  // ── Offline queue ─────────────────────────
  const _enqueue = (record) => {
    const q = State.store.get(CONFIG.cache.queue, []);
    q.push(record);
    State.store.set(CONFIG.cache.queue, q);
  };

  const _flushQueue = async () => {
    if (!_ready || !navigator.onLine) return;
    const q = State.store.get(CONFIG.cache.queue, []);
    if (!q.length) return;

    let saved = 0;
    for (const rec of q) {
      try { await _db.collection('records').add(rec); saved++; } catch {}
    }
    if (saved === q.length) {
      State.store.set(CONFIG.cache.queue, []);
      UI.toast(`✅ تمت مزامنة ${saved} سجل`);
    }
  };

  // ── Helpers ───────────────────────────────
  const _updateStatus = (msg) => {
    const el = document.getElementById('db-status');
    if (el) el.textContent = msg;
  };

  const pendingCount = () =>
    State.store.get(CONFIG.cache.queue, []).length;

  // ── Online/offline events ─────────────────
  window.addEventListener('online',  () => { _flushQueue(); });
  window.addEventListener('offline', () => { _updateStatus('🟡 لا يوجد اتصال — التسجيل يعمل محلياً'); });

  return { init, write, pendingCount };
})();
