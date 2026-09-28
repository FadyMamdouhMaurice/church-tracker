// ─────────────────────────────────────────────
//  ui/home.js  —  Home screen
// ─────────────────────────────────────────────

const HomeScreen = (() => {

  const init = () => {
    Utils.on('logout-btn',  'click', _logout);
    Utils.on('btn-att',     'click', () => Router.go('attendance'));
    Utils.on('btn-call',    'click', () => Router.go('students', 'call'));
    Utils.on('btn-visit',   'click', () => Router.go('students', 'visit'));
    Utils.on('btn-profile', 'click', () => Router.go('students', 'profile'));
    Utils.on('btn-admin',       'click', () => Router.go('admin'));
    Utils.on('btn-servant-att', 'click', () => Router.go('servant-att'));

    State.on('recordsChanged',     _renderStats);
    State.on('activeClassChanged', _render);
    State.on('userChanged',        _render);
  };

  const _render = () => {
    const user = State.get('user');
    if (!user) return;

    const cls = State.getMyClass();

    Utils.el('home-servant-name').textContent = user.displayName;
    Utils.el('home-role-badge').textContent   = user.role === 'admin' ? 'أمين خدمة' : 'خادم';
    Utils.el('home-class-name').textContent   = cls?.name ?? 'كل الفصول';
    Utils.el('home-class-sub').textContent    = cls?.subtitle ?? CONFIG.church.batch;
    Utils.el('home-week-badge').textContent   = Utils.weekLabel(Utils.weekKey());

    // Admin sees class switcher + dashboard button
    const isAdmin = user.role === 'admin';
    Utils.el('admin-btn-wrap').style.display    = isAdmin ? '' : 'none';
    Utils.el('class-switcher-wrap').style.display = isAdmin ? '' : 'none';

    if (isAdmin) _buildClassSwitcher();

    _renderStats();
  };

  const _buildClassSwitcher = () => {
    const wrap      = Utils.el('class-switcher');
    const activeId  = State.getActiveClassId();

    wrap.innerHTML = `
      <option value="__admin__">كل الفصول</option>
      ${CONFIG.classes.map(c =>
        `<option value="${c.id}" ${c.id === activeId ? 'selected' : ''}>${c.name}</option>`
      ).join('')}`;

    wrap.onchange = () => {
      State.setActiveClass(wrap.value === '__admin__' ? '__admin__' : wrap.value);
    };
  };

  const _renderStats = () => {
    const students  = State.getMyStudents();
    const records   = State.get('records');
    const wk        = Utils.weekKey();
    const threshold = new Date(Date.now() - CONFIG.followup.visitWarningDays * 86_400_000);

    const attThisWeek = records.filter(r =>
      r.type === 'attendance' && r.week === wk &&
      students.some(s => s.id === r.studentId)
    );
    const present    = attThisWeek.filter(r => r.present).length;
    const attPct     = attThisWeek.length
      ? `${Math.round(present / attThisWeek.length * 100)}%` : '—';

    const visits     = records.filter(r => r.type === 'visit');
    const needsVisit = students.filter(s => {
      const latest = visits.filter(v => v.studentId === s.id)
        .map(v => new Date(v.date)).sort((a, b) => b - a)[0];
      return !latest || latest < threshold;
    }).length;

    Utils.html('home-stats', `
      <div class="stat-card"><div class="stat-card__num">${students.length}</div><div class="stat-card__lbl">إجمالي الأولاد</div></div>
      <div class="stat-card"><div class="stat-card__num">${attPct}</div><div class="stat-card__lbl">حضور هذا الأسبوع</div></div>
      <div class="stat-card"><div class="stat-card__num">${needsVisit}</div><div class="stat-card__lbl">ينتظر افتقاد</div></div>
    `);
  };

  const _logout = () => { State.setUser(null); Router.go('login'); };

  Router.onEnter('home', _render);

  return { init };
})();
