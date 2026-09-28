// ─────────────────────────────────────────────
//  ui/mass-attendance.js
//  Weekly Friday mass attendance
//  Tab 1: Students (by class, like regular attendance)
//  Tab 2: Servants (all servants)
// ─────────────────────────────────────────────

const MassAttendanceScreen = (() => {
  let _studState   = {}; // { studentId: true|false }
  let _servState   = {}; // { servantName: true|false }
  let _activeTab   = 'students';

  // Build Friday-based week options (same week key, different label)
  const _buildFridayOptions = (sel, count = 8) => {
    const opts = [];
    for (let i = 0; i < count; i++) {
      const d = new Date();
      // Go back i weeks from last Friday
      const day  = d.getDay();
      const diff = (day >= 5 ? day - 5 : day + 2);
      d.setDate(d.getDate() - diff - i * 7);
      const key   = d.toISOString().split('T')[0];
      const label = 'جمعة ' + d.toLocaleDateString('ar-EG', { day:'numeric', month:'long', year:'numeric' });
      opts.push(`<option value="${key}"${i===0?' selected':''}>${label}</option>`);
    }
    sel.innerHTML = opts.join('');
  };

  const init = () => {
    Utils.on('mass-back',         'click', () => Router.back());
    Utils.on('mass-week-sel',     'change', _load);
    Utils.on('mass-save-btn',     'click', _save);
    Utils.on('mass-tab-students', 'click', () => _switchTab('students'));
    Utils.on('mass-tab-servants', 'click', () => _switchTab('servants'));
    Utils.el('mass-students-list')?.addEventListener('click', _onStudentClick);
    Utils.el('mass-servants-list')?.addEventListener('click', _onServantClick);
  };

  const _onEnter = () => {
    _buildFridayOptions(Utils.el('mass-week-sel'));
    _activeTab = 'students';
    _switchTab('students');
    _load();
  };

  const _switchTab = (tab) => {
    _activeTab = tab;
    Utils.el('mass-tab-students')?.classList.toggle('active', tab === 'students');
    Utils.el('mass-tab-servants')?.classList.toggle('active', tab === 'servants');
    Utils.el('mass-students-list').style.display = tab === 'students' ? '' : 'none';
    Utils.el('mass-servants-list').style.display = tab === 'servants' ? '' : 'none';
  };

  const _load = () => {
    const wk      = Utils.el('mass-week-sel').value;
    const records = State.get('records');
    _studState    = {};
    _servState    = {};

    records
      .filter(r => r.type === 'mass-attendance' && r.week === wk)
      .forEach(r => {
        if (r.studentId)    _studState[r.studentId]    = r.present;
        if (r.servantName)  _servState[r.servantName]  = r.present;
      });

    _render();
  };

  const _render = () => {
    _renderSummary();
    _renderStudents();
    _renderServants();
  };

  const _renderSummary = () => {
    const myStudents = State.getMyStudents();
    const allServants = CONFIG.classes.flatMap(c => c.servants);
    const sDone  = Object.keys(_studState).length;
    const sPresent = Object.values(_studState).filter(Boolean).length;
    const svDone = Object.keys(_servState).length;
    const svPresent = Object.values(_servState).filter(Boolean).length;

    Utils.el('mass-summary').innerHTML =
      `👦 مخدومين: <b>${sPresent}</b>/${myStudents.length} حضور` +
      (sDone ? ` (${sDone} مسجَّل)` : '') +
      `&nbsp;&nbsp;|&nbsp;&nbsp;` +
      `🧑‍💼 خدام: <b>${svPresent}</b>/${allServants.length} حضور` +
      (svDone ? ` (${svDone} مسجَّل)` : '');
  };

  const _renderStudents = () => {
    const students = State.getMyStudents();
    Utils.html('mass-students-list', students.map(s => `
      <div class="att-row">
        <div class="att-row__avatar">${Utils.initials(s.name)}</div>
        <div class="att-row__name">${s.name.split(' ').slice(0,3).join(' ')}</div>
        <div class="att-row__btns">
          <button class="att-btn att-btn--present ${_studState[s.id]===true  ?'att-btn--active':''}"
                  data-id="${s.id}" data-val="true">حضر</button>
          <button class="att-btn att-btn--absent  ${_studState[s.id]===false ?'att-btn--active':''}"
                  data-id="${s.id}" data-val="false">غاب</button>
        </div>
      </div>`).join(''));
  };

  const _renderServants = () => {
    const byClass = CONFIG.classes.map(c => ({
      cls: c,
      servants: c.servants,
    }));

    Utils.html('mass-servants-list', byClass.map(({ cls, servants }) => `
      <div class="servant-att-class">
        <div class="servant-att-class__title">${cls.name}</div>
        <div class="servant-att-rows-grid">
          ${servants.map(name => `
            <div class="att-row" data-name="${name}">
              <div class="att-row__avatar">${name[0]}</div>
              <div class="att-row__name">${name}</div>
              <div class="att-row__btns">
                <button class="att-btn att-btn--present ${_servState[name]===true  ?'att-btn--active':''}"
                        data-name="${name}" data-val="true">حضر</button>
                <button class="att-btn att-btn--absent  ${_servState[name]===false ?'att-btn--active':''}"
                        data-name="${name}" data-val="false">غاب</button>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join(''));
  };

  const _onStudentClick = (e) => {
    const btn = e.target.closest('.att-btn');
    if (!btn) return;
    const id      = parseInt(btn.dataset.id, 10);
    _studState[id] = btn.dataset.val === 'true';
    _renderStudents();
    _renderSummary();
  };

  const _onServantClick = (e) => {
    const btn = e.target.closest('.att-btn');
    if (!btn || !btn.dataset.name) return;
    _servState[btn.dataset.name] = btn.dataset.val === 'true';
    _renderServants();
    _renderSummary();
  };

  const _save = async () => {
    const wk       = Utils.el('mass-week-sel').value;
    const studEntries = Object.entries(_studState);
    const servEntries = Object.entries(_servState);
    const total = studEntries.length + servEntries.length;

    if (!total) { UI.toast('سجّل الحضور أولاً'); return; }

    const btn = Utils.el('mass-save-btn');
    btn.disabled    = true;
    btn.textContent = 'جارٍ الحفظ…';

    for (const [id, present] of studEntries) {
      await DB.write({
        type:      'mass-attendance',
        week:      wk,
        studentId: parseInt(id, 10),
        present,
        date:      wk,
      });
    }
    for (const [name, present] of servEntries) {
      await DB.write({
        type:        'mass-attendance',
        week:        wk,
        servantName: name,
        present,
        date:        wk,
      });
    }

    btn.disabled    = false;
    btn.textContent = '💾 حفظ الحضور';
    UI.toast(`✅ تم حفظ القداس — ${studEntries.length} مخدوم، ${servEntries.length} خادم`);
  };

  Router.onEnter('mass', _onEnter);
  return { init };
})();
