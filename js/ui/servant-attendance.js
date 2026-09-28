// ─────────────────────────────────────────────
//  ui/servant-attendance.js
//  Weekly attendance for servants (admin only)
// ─────────────────────────────────────────────

const ServantAttendanceScreen = (() => {
  let _state = {}; // { servantName: true|false }

  // All servants flat list from config
  const _allServants = () =>
    CONFIG.classes.flatMap(c =>
      c.servants.map(name => ({ name, className: c.name, classId: c.id }))
    );

  const init = () => {
    Utils.on('servant-att-back', 'click', () => Router.back());
    Utils.on('servant-att-week', 'change', _load);
    Utils.on('servant-att-save', 'click', _save);
    Utils.el('servant-att-list')?.addEventListener('click', _onClick);
  };

  const _onEnter = () => {
    Utils.buildWeekOptions(Utils.el('servant-att-week'));
    _load();
  };

  const _load = () => {
    const wk      = Utils.el('servant-att-week').value;
    const records = State.get('records');

    _state = {};
    records
      .filter(r => r.type === 'servant-attendance' && r.week === wk)
      .forEach(r => { _state[r.servantName] = r.present; });

    _render();
  };

  const _render = () => {
    const servants = _allServants();
    const present  = Object.values(_state).filter(Boolean).length;
    const total    = Object.keys(_state).length;

    Utils.el('servant-att-summary').textContent = total
      ? `تم تسجيل ${total} من ${servants.length} — حضر: ${present} — غاب: ${total - present}`
      : 'لم يُسجَّل بعد';

    // Group by class
    const byClass = CONFIG.classes.map(c => ({
      cls:      c,
      servants: c.servants.map(name => ({ name, classId: c.id })),
    }));

    Utils.html('servant-att-list', byClass.map(({ cls, servants }) => `
      <div class="servant-att-class">
        <div class="servant-att-class__title">${cls.name}</div>
        ${servants.map(s => {
          const v = _state[s.name];
          return `<div class="att-row">
            <div class="att-row__avatar">${s.name[0]}</div>
            <div class="att-row__name">${s.name}</div>
            <div class="att-row__btns">
              <button class="att-btn att-btn--present ${v === true  ? 'att-btn--active' : ''}"
                      data-name="${s.name}" data-val="true">حضر</button>
              <button class="att-btn att-btn--absent  ${v === false ? 'att-btn--active' : ''}"
                      data-name="${s.name}" data-val="false">غاب</button>
            </div>
          </div>`;
        }).join('')}
      </div>`).join(''));
  };

  const _onClick = (e) => {
    const btn = e.target.closest('.att-btn');
    if (!btn) return;
    const name    = btn.dataset.name;
    const present = btn.dataset.val === 'true';
    _state[name]  = present;
    _render();
  };

  const _save = async () => {
    const wk      = Utils.el('servant-att-week').value;
    const entries = Object.entries(_state);
    if (!entries.length) { UI.toast('سجّل الحضور أولاً'); return; }

    const btn = Utils.el('servant-att-save');
    const ind = Utils.el('servant-att-saving');
    btn.disabled    = true;
    ind.textContent = 'جارٍ الحفظ…';

    for (const [name, present] of entries) {
      await DB.write({
        type:        'servant-attendance',
        week:        wk,
        servantName: name,
        present,
        date:        wk,
      });
    }

    btn.disabled    = false;
    ind.textContent = '';
    UI.toast(`✅ تم حفظ حضور ${entries.length} خادم`);
  };

  Router.onEnter('servant-att', _onEnter);

  return { init };
})();
