// ─────────────────────────────────────────────
//  sheets.js  —  Google Sheets read + backup
// ─────────────────────────────────────────────

const Sheets = (() => {
  const URL = CONFIG.sheets.scriptUrl;

  // ── Load students (classes + students from all tabs) ──
  const loadStudents = async () => {
    if (!URL) throw new Error('Apps Script URL not configured');

    const res  = await fetch(`${URL}?action=students`, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    return { classes: data.classes, students: data.students };
  };

  // ── Sync a written record back to Sheets ─────────────
  const syncRecord = (record) => {
    if (!URL) return;

    const student = State.getStudentById(record.studentId);
    const cls     = State.getClassById(record.classId);

    fetch(URL, {
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

  return { loadStudents, syncRecord, exportCSV };
})();
