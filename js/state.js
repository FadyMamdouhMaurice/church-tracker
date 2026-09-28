// ─────────────────────────────────────────────
//  state.js  —  Single source of truth
// ─────────────────────────────────────────────

const State = (() => {
  // ── Private ───────────────────────────────
  let _data = {
    user:     null,   // { displayName, classId, role: 'servant'|'admin' }
    classes:  [],     // [{ id, name }]
    students: [],     // [{ id, cls, name, address, phones, school, notes }]
    records:  [],     // Firestore records (attendance / call / visit)
  };

  const _listeners = {};

  // ── Storage helpers ───────────────────────
  const store = {
    get: (key, fallback = null) => {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
      } catch { return fallback; }
    },
    set: (key, value) => {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    },
  };

  // ── Pub/sub ───────────────────────────────
  const on  = (event, fn) => { (_listeners[event] ??= []).push(fn); };
  const off = (event, fn) => { _listeners[event] = (_listeners[event] ?? []).filter(f => f !== fn); };
  const emit = (event, payload) => { (_listeners[event] ?? []).forEach(fn => fn(payload)); };

  // ── Getters ───────────────────────────────
  const get = key => _data[key];

  const getMyStudents = () => {
    if (!_data.user) return [];
    if (_data.user.role === 'admin') return _data.students;
    return _data.students.filter(s => s.cls === _data.user.classId);
  };

  const getMyClass = () =>
    _data.classes.find(c => c.id === _data.user?.classId) ?? null;

  const getStudentById = id =>
    _data.students.find(s => s.id === id) ?? null;

  const getClassById = id =>
    _data.classes.find(c => c.id === id) ?? null;

  const getRecordsFor = (studentId) =>
    _data.records.filter(r => r.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));

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

  // ── Hydrate from cache on boot ────────────
  const hydrate = () => {
    _data.user = store.get(CONFIG.cache.user);
    _data.records = store.get(CONFIG.cache.records, []);
    const cached = store.get(CONFIG.cache.students);
    if (cached) { _data.classes = cached.classes; _data.students = cached.students; }
    return {
      hasUser:     !!_data.user,
      hasStudents: _data.students.length > 0,
      cacheAge:    cached ? Math.floor((Date.now() - cached.loadedAt) / 60000) : 999,
    };
  };

  return { on, off, emit, get, getMyStudents, getMyClass,
           getStudentById, getClassById, getRecordsFor,
           setUser, setStudentsData, setRecords, addRecord,
           hydrate, store };
})();
