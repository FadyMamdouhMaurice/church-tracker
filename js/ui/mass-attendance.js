// ─────────────────────────────────────────────
//  ui/mass-attendance.js
//  Weekly Friday mass attendance
//
//  Servant: sees own class students ONLY, no servants tab
//  Admin:   sees all students (filtered by class switcher) + servants tab
// ─────────────────────────────────────────────

const MassAttendanceScreen = (() => {
  let _studState   = {};
  let _servState   = {};
  let _activeTab   = 'students';

  const _isAdmin = () => State.get('user')?.role === 'admin';

  const _buildFridayOptions = (sel, count = 8) => {
    const opts = [];
    for (let i = 0; i < count; i++) {
      const d   = new Date();
      const day = d.getDay();
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

    // Hide servants tab for non-admins
    const servantsTabBtn = Utils.el('mass-tab-servants');
    if (servantsTabBtn) {
      servantsTabBtn.style.display = _isAdmin() ? '' : 'none';
    }

    _activeTab = 'students';
    _switchTab('students');
    _load();
  };

  const _switchTab = (tab) => {
    // Non-admins can only be on students tab
    if (!_isAdmin() && tab === 'servants') tab = 'students';

    _activeTab = tab;
    Utils.el('mass-tab-students')?.classList.toggle('active', tab === 'students');
    Utils.el('mass-tab-servants')?.classList.toggle('active', tab === 'servants');
    Utils.el('mass-students-list').style.display = tab === 'students' ? '' : 'none';
    Utils.el('mass-servants-list').style.display = tab === 'servants' && _isAdmin() ? '' : 'none';
  };

  const _load = () => {
    const wk      = Utils.el('mass-week-sel').value;
    const records = State.get('records');
    _studState = {};
    _servState = {};

    records
      .filter(r => r.type === 'mass-attendance' && r.week === wk)
      .forEach(r => {
        if (r.studentId)   _studState[r.studentId]   = r.present;
        if (r.servantName) _servState[r.servantName] = r.present;
      });

    _render();
  };

  const _render = () => {
    _renderSummary();
    _renderStudents();
    if (_isAdmin()) _renderServants();
  };

  const _renderSummary = () => {
    const myStudents  = State.getMyStudents();
    const sDone       = Object.keys(_studState).length;
    const sPresent    = Object.values(_studState).filter(Boolean).length;

    let html = `👦 مخدومين: <b>${sPresent}</b>/${myStudents.length} حضور` +
               (sDone ? ` (${sDone} مسجَّل)` : '');

    // Admins also see servant summary
    if (_isAdmin()) {
      const allServants = CONFIG.classes.flatMap(c => c.servants);
      const svDone      = Object.keys(_servState).length;
      const svPresent   = Object.values(_servState).filter(Boolean).length;
      html += `&nbsp;&nbsp;|&nbsp;&nbsp;🧑‍💼 خدام: <b>${svPresent}</b>/${allServants.length} حضور` +
              (svDone ? ` (${svDone} مسجَّل)` : '');
    }

    Utils.el('mass-summary').innerHTML = html;
  };

  const _renderStudents = () => {
    // getMyStudents() already respects active class for admins
    // and returns own class for regular servants
    const students = State.getMyStudents();

    if (!students.length) {
      Utils.html('mass-students-list',
        '<div class="empty-state"><div class="empty-state__icon">👦</div><p>لا توجد أولاد</p></div>');
      return;
    }

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

  // Servants tab — admin only
  const _renderServants = () => {
    const byClass = CONFIG.classes.map(c => ({ cls: c, servants: c.servants }));

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
    if (!btn || !btn.dataset.id) return;
    _studState[parseInt(btn.dataset.id, 10)] = btn.dataset.val === 'true';
    _renderStudents();
    _renderSummary();
  };

  const _onServantClick = (e) => {
    if (!_isAdmin()) return;
    const btn = e.target.closest('.att-btn');
    if (!btn || !btn.dataset.name) return;
    _servState[btn.dataset.name] = btn.dataset.val === 'true';
    _renderServants();
    _renderSummary();
  };

  const _save = async () => {
    const wk          = Utils.el('mass-week-sel').value;
    const studEntries = Object.entries(_studState);
    const servEntries = _isAdmin() ? Object.entries(_servState) : [];
    const total       = studEntries.length + servEntries.length;

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

    const msg = servEntries.length > 0
      ? `✅ تم الحفظ — ${studEntries.length} مخدوم، ${servEntries.length} خادم`
      : `✅ تم حفظ حضور ${studEntries.length} مخدوم`;
    UI.toast(msg);
  };

  Router.onEnter('mass', _onEnter);
  return { init };
})();
