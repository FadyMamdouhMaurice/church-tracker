// ─────────────────────────────────────────────
//  sheets.js  —  Google Sheets read + backup
// ─────────────────────────────────────────────

const Sheets = (() => {
  // Read URL dynamically so config changes take effect immediately
  const _url = () => CONFIG.sheets.scriptUrl;

  // ── Load students (classes + students from all tabs) ──
  const loadStudents = async () => {
    const SCRIPT_URL = _url();
    if (!SCRIPT_URL) throw new Error('Apps Script URL not configured');

    console.log('[Sheets] Loading from:', SCRIPT_URL.slice(0, 60) + '...');

    let res;
    try {
      res = await fetch(`${SCRIPT_URL}?action=students`, { mode: 'cors' });
    } catch(e) {
      console.error('[Sheets] fetch failed:', e.message);
      throw e;
    }

    console.log('[Sheets] HTTP status:', res.status, res.statusText);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    console.log('[Sheets] Response length:', text.length, '| First 100 chars:', text.slice(0, 100));

    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      console.error('[Sheets] JSON parse failed:', text.slice(0, 200));
      throw new Error('Invalid JSON response');
    }

    if (data.error) {
      console.error('[Sheets] Apps Script error:', data.error);
      throw new Error(data.error);
    }

    console.log('[Sheets] Loaded:', data.classes?.length, 'classes,', data.students?.length, 'students');
    return { classes: data.classes, students: data.students };
  };

  // ── Sync a written record back to Sheets ─────────────
  const syncRecord = (record) => {
    const SCRIPT_URL = _url();
    if (!SCRIPT_URL) return;

    const student = State.getStudentById(record.studentId);
    const cls     = State.getClassById(record.classId);

    fetch(SCRIPT_URL, {
      method: 'POST',
      mode:   'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveRecord',
        record: {
          ...record,
          studentName: student?.name  ?? '',
          className:   cls?.name      ?? '',
        },
      }),
    }).catch(() => {/* fire-and-forget — Firestore is the source of truth */});
  };

  // ── Sync student edit to Google Sheets ──────────────────
  const syncStudentEdit = (student) => {
    const SCRIPT_URL = _url();
    if (!SCRIPT_URL) return;
    fetch(SCRIPT_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'updateStudent', student }),
    }).catch(() => {});
  };

  // ── Export all records as CSV ─────────────────────────
  const exportCSV = () => {
    const records  = State.get('records');
    const students = State.get('students');
    const classes  = State.get('classes');

    const header = ['الاسم', 'الفصل', 'النوع', 'التاريخ', 'الأسبوع', 'الحضور', 'بواسطة', 'ملاحظة'];
    const rows   = records.map(r => {
      const s = students.find(x => x.id === r.studentId);
      const c = classes.find(x => x.id === s?.cls);
      return [
        s?.name    ?? '',
        c?.name    ?? '',
        r.type,
        r.date,
        r.week     ?? '',
        r.present === true ? 'حضر' : r.present === false ? 'غاب' : '',
        r.by       ?? '',
        r.note     ?? '',
      ];
    });

    const csv = '\uFEFF' + [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const a = document.createElement('a');
    a.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `church_tracker_${Utils.today()}.csv`;
    a.click();
  };

  return { loadStudents, syncRecord, syncStudentEdit, exportCSV };
})();
