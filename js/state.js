// ─────────────────────────────────────────────
//  state.js  —  Single source of truth
// ─────────────────────────────────────────────

const State = (() => {
  let _data = {
    user:          null,   // { displayName, classId, role, activeClassId? }
    classes:       [],     // from Sheets tabs
    students:      [],     // from Sheets rows
    records:       [],     // from Firestore
  };

  const _listeners = {};

  // ── Storage ───────────────────────────────
  const store = {
    get: (key, fallback = null) => {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set: (key, value) => {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
  };

  // ── Pub/sub ───────────────────────────────
  const on   = (event, fn)  => { (_listeners[event] ??= []).push(fn); };
  const off  = (event, fn)  => { _listeners[event] = (_listeners[event] ?? []).filter(f => f !== fn); };
  const emit = (event, pay) => { (_listeners[event] ?? []).forEach(fn => fn(pay)); };

  // ── Getters ───────────────────────────────
  const get = key => _data[key];

  // The class currently being viewed (admin can switch)
  const getActiveClassId = () =>
    _data.user?.activeClassId ?? _data.user?.classId ?? null;

  const getMyStudents = () => {
    const classId = getActiveClassId();
    if (!classId || classId === '__admin__') return _data.students;
    return _data.students.filter(s => s.cls === classId);
  };

  const getMyClass = () => {
    const id = getActiveClassId();
    // Try CONFIG.classes first (has subtitle), then Sheet-loaded classes
    return CONFIG.classes.find(c => c.id === id)
        ?? _data.classes.find(c => c.id === id)
        ?? null;
  };

  const getStudentById  = id  => _data.students.find(s => s.id === id)   ?? null;
  const getClassById    = id  => CONFIG.classes.find(c => c.id === id)
                              ?? _data.classes.find(c => c.id === id)     ?? null;
  const getRecordsFor   = id  => _data.records
    .filter(r => r.studentId === id)
    .sort((a, b) => b.date.localeCompare(a.date));

  // ── Admin: switch active class ────────────
  const setActiveClass = (classId) => {
    if (_data.user?.role !== 'admin') return;
    _data.user = { ..._data.user, activeClassId: classId };
    store.set(CONFIG.cache.user, _data.user);
    emit('activeClassChanged', classId);
  };

  // ── Setters ───────────────────────────────
  const setUser = (user) => {
    _data.user = user;
    store.set(CONFIG.cache.user, user);
    emit('userChanged', user);
  };

  const setStudentsData = ({ classes, students }) => {
    _data.classes  = classes;
    _data.students = students;
    store.set(CONFIG.cache.students, { classes, students, loadedAt: Date.now() });
    emit('studentsLoaded', { classes, students });
  };

  const setRecords = (records) => {
    _data.records = records;
    store.set(CONFIG.cache.records, records);
    emit('recordsChanged', records);
  };

  const addRecord = (record) => {
    _data.records = [record, ..._data.records];
    store.set(CONFIG.cache.records, _data.records);
    emit('recordsChanged', _data.records);
  };

  // ── Hydrate from cache ────────────────────
  const hydrate = () => {
    _data.user    = store.get(CONFIG.cache.user);
    _data.records = store.get(CONFIG.cache.records, []);
    const cached  = store.get(CONFIG.cache.students);
    if (cached) { _data.classes = cached.classes; _data.students = cached.students; }
    return {
      hasUser:     !!_data.user,
      hasStudents: _data.students.length > 0,
      cacheAge:    cached ? Math.floor((Date.now() - cached.loadedAt) / 60000) : 999,
    };
  };

  return {
    on, off, emit, get,
    getActiveClassId, getMyStudents, getMyClass,
    getStudentById, getClassById, getRecordsFor,
    setUser, setStudentsData, setRecords, addRecord,
    setActiveClass, hydrate, store,
  };
})();
