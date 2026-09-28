// ─────────────────────────────────────────────
//  ui/servant-attendance.js
//  Weekly attendance for servants (admin only)
//  States: present | excused (with reason) | absent
// ─────────────────────────────────────────────

const ServantAttendanceScreen = (() => {
  // _state[name] = { present: true } | { present: false, excused: true, note: '...' } | { present: false, excused: false }
  let _state = {};

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
      .forEach(r => {
        _state[r.servantName] = {
          present: r.present,
          excused: r.excused ?? false,
          note:    r.note    ?? '',
        };
      });
    _render();
  };

  const _render = () => {
    const servants = _allServants();
    const present  = Object.values(_state).filter(s => s.present).length;
    const excused  = Object.values(_state).filter(s => !s.present && s.excused).length;
    const absent   = Object.values(_state).filter(s => !s.present && !s.excused).length;
    const total    = Object.keys(_state).length;

    Utils.el('servant-att-summary').innerHTML = total
      ? `تم تسجيل ${total} من ${servants.length} &nbsp;|&nbsp; ✅ حضر: <b>${present}</b> &nbsp; ⚠️ بعذر: <b>${excused}</b> &nbsp; ❌ غياب: <b>${absent}</b>`
      : 'لم يُسجَّل بعد';

    const byClass = CONFIG.classes.map(c => ({
      cls:      c,
      servants: c.servants.map(name => ({ name })),
    }));

    Utils.html('servant-att-list', byClass.map(({ cls, servants }) => `
      <div class="servant-att-class">
        <div class="servant-att-class__title">${cls.name}</div>
        ${servants.map(s => _servantRow(s.name)).join('')}
      </div>`).join(''));
  };

  const _servantRow = (name) => {
    const v = _state[name];
    const isPresent = v?.present === true;
    const isExcused = v && !v.present && v.excused;
    const isAbsent  = v && !v.present && !v.excused;

    return `<div class="servant-att-row" data-name="${name}">
      <div class="att-row__avatar">${name[0]}</div>
      <div class="servant-att-row__info">
        <div class="att-row__name">${name}</div>
        ${isExcused && v.note ? `<div class="servant-att-row__note">📝 ${v.note}</div>` : ''}
      </div>
      <div class="servant-att-btns">
        <button class="s-att-btn s-att-btn--present ${isPresent ? 'active' : ''}"
                data-name="${name}" data-action="present" title="حضر">✅</button>
        <button class="s-att-btn s-att-btn--excused ${isExcused ? 'active' : ''}"
                data-name="${name}" data-action="excused" title="غياب بعذر">⚠️</button>
        <button class="s-att-btn s-att-btn--absent ${isAbsent ? 'active' : ''}"
                data-name="${name}" data-action="absent" title="غياب بدون عذر">❌</button>
      </div>
    </div>`;
  };

  const _onClick = async (e) => {
    const btn = e.target.closest('.s-att-btn');
    if (!btn) return;

    const name   = btn.dataset.name;
    const action = btn.dataset.action;

    if (action === 'present') {
      _state[name] = { present: true, excused: false, note: '' };
      _render();
      return;
    }

    if (action === 'absent') {
      _state[name] = { present: false, excused: false, note: '' };
      _render();
      return;
    }

    if (action === 'excused') {
      // Ask for reason
      const note = await UI.modal.open({
        title:       `غياب بعذر: ${name}`,
        placeholder: 'اكتب سبب الغياب...',
      });
      if (note === null) return; // cancelled
      _state[name] = { present: false, excused: true, note };
      _render();
    }
  };

  const _save = async () => {
    const wk      = Utils.el('servant-att-week').value;
    const entries = Object.entries(_state);
    if (!entries.length) { UI.toast('سجّل الحضور أولاً'); return; }

    const btn = Utils.el('servant-att-save');
    const ind = Utils.el('servant-att-saving');
    btn.disabled    = true;
    ind.textContent = 'جارٍ الحفظ…';

    for (const [name, val] of entries) {
      await DB.write({
        type:        'servant-attendance',
        week:        wk,
        servantName: name,
        present:     val.present,
        excused:     val.excused,
        note:        val.note ?? '',
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
