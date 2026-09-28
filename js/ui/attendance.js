// ─────────────────────────────────────────────
//  ui/attendance.js  —  Weekly attendance
// ─────────────────────────────────────────────

const AttendanceScreen = (() => {
  let _state = {}; // { studentId: true|false }

  const init = () => {
    Utils.on('att-back',     'click', () => Router.back());
    Utils.on('att-week-sel', 'change', _load);
    Utils.on('att-save-btn', 'click', _save);

    // Delegated click on the list for حضر / غاب buttons
    Utils.el('att-list')?.addEventListener('click', _onClick);
  };

  const _onEnter = () => {
    Utils.buildWeekOptions(Utils.el('att-week-sel'));
    _load();
  };

  const _load = () => {
    const wk       = Utils.el('att-week-sel').value;
    const students = State.getMyStudents();
    const records  = State.get('records');

    _state = {};
    records
      .filter(r => r.type === 'attendance' && r.week === wk)
      .forEach(r => {
        if (students.some(s => s.id === r.studentId)) {
          _state[r.studentId] = r.present;
        }
      });

    _render();
  };

  const _render = () => {
    const students = State.getMyStudents();
    const done     = Object.keys(_state).length;
    const present  = Object.values(_state).filter(Boolean).length;

    Utils.el('att-summary').textContent = done
      ? `تم تسجيل ${done} من ${students.length} — حضر: ${present} — غاب: ${done - present}`
      : 'لم يُسجَّل بعد';

    Utils.html('att-list', students.map(s => `
      <div class="att-row">
        <div class="att-row__avatar">${Utils.initials(s.name)}</div>
        <div class="att-row__name">${s.name.split(' ').slice(0, 3).join(' ')}</div>
        <div class="att-row__btns">
          <button class="att-btn att-btn--present ${_state[s.id] === true  ? 'att-btn--active' : ''}"
                  data-id="${s.id}" data-val="true">حضر</button>
          <button class="att-btn att-btn--absent  ${_state[s.id] === false ? 'att-btn--active' : ''}"
                  data-id="${s.id}" data-val="false">غاب</button>
        </div>
      </div>`).join(''));
  };

  const _onClick = (e) => {
    const btn = e.target.closest('.att-btn');
    if (!btn) return;
    const id      = parseInt(btn.dataset.id, 10);
    const present = btn.dataset.val === 'true';
    _state[id]    = present;
    _render();
  };

  const _save = async () => {
    const wk      = Utils.el('att-week-sel').value;
    const entries = Object.entries(_state);
    if (!entries.length) { UI.toast('سجّل الحضور أولاً'); return; }

    const saveBtn = Utils.el('att-save-btn');
    saveBtn.disabled    = true;
    saveBtn.textContent = 'جارٍ الحفظ…';

    for (const [id, present] of entries) {
      await DB.write({
        type:      'attendance',
        week:      wk,
        studentId: parseInt(id, 10),
        present,
        date:      wk,
      });
    }

    saveBtn.disabled    = false;
    saveBtn.textContent = '💾 حفظ الحضور';
    UI.toast(`✅ تم حفظ حضور ${entries.length} ولد`);
  };

  Router.onEnter('attendance', _onEnter);

  return { init };
})();
