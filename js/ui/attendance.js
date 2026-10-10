// ─────────────────────────────────────────────
//  ui/attendance.js  —  Weekly attendance
//  DEFAULT = absent — tap once to mark present
// ─────────────────────────────────────────────

const AttendanceScreen = (() => {
  let _state = {}; // { studentId: true|false } — pre-filled false

  const init = () => {
    Utils.on('att-back',     'click', () => Router.back());
    Utils.on('att-week-sel', 'change', _load);
    Utils.on('att-save-btn', 'click', _save);
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

    // DEFAULT: everyone absent
    _state = {};
    students.forEach(s => { _state[s.id] = false; });

    // Override with saved records
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
    const present  = Object.values(_state).filter(Boolean).length;
    const total    = students.length;

    Utils.el('att-summary').textContent =
      `حضر: ${present} من ${total} — غاب: ${total - present}`;

    Utils.html('att-list', students.map(s => {
      const isPresent = _state[s.id] === true;
      return `
        <div class="att-row ${isPresent ? 'att-row--present' : ''}">
          <div class="att-row__avatar ${isPresent ? 'att-row__avatar--present' : ''}">${Utils.initials(s.name)}</div>
          <div class="att-row__name">${s.name.split(' ').slice(0, 3).join(' ')}</div>
          <div class="att-row__btns">
            <button class="att-btn att-btn--present ${isPresent ? 'att-btn--active' : ''}"
                    data-id="${s.id}" data-val="true">✅ حضر</button>
          </div>
        </div>`;
    }).join(''));
  };

  const _onClick = (e) => {
    const btn = e.target.closest('.att-btn');
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    // Toggle: tap again to undo
    _state[id] = !(_state[id] === true);
    _render();
  };

  const _save = async () => {
    const wk      = Utils.el('att-week-sel').value;
    const entries = Object.entries(_state);
    if (!entries.length) { UI.toast('لا يوجد أولاد'); return; }

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

    const presentCount = entries.filter(([,v]) => v).length;
    UI.toast(`✅ تم الحفظ — حضر ${presentCount} من ${entries.length}`);
  };

  Router.onEnter('attendance', _onEnter);
  return { init };
})();
