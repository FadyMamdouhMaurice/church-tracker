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
    Utils.on('btn-admin',   'click', () => Router.go('admin'));

    State.on('recordsChanged', _renderStats);
    State.on('userChanged',    _render);
  };

  const _render = () => {
    const user = State.get('user');
    const cls  = State.getMyClass();

    Utils.el('home-servant-name').textContent = user.displayName;
    Utils.el('home-role-badge').textContent   = user.role === 'admin' ? 'أمين خدمة' : 'خادم';
    Utils.el('home-class-name').textContent   = cls?.name ?? 'كل الفصول';
    Utils.el('home-week-badge').textContent   = Utils.weekLabel(Utils.weekKey());

    Utils.el('admin-btn-wrap').style.display = user.role === 'admin' ? '' : 'none';

    _renderStats();
  };

  const _renderStats = () => {
    const students = State.getMyStudents();
    const records  = State.get('records');
    const wk       = Utils.weekKey();
    const threshold = new Date(Date.now() - CONFIG.followup.visitWarningDays * 86_400_000);

    const attThisWeek = records.filter(r =>
      r.type === 'attendance' && r.week === wk &&
      students.some(s => s.id === r.studentId)
    );
    const present    = attThisWeek.filter(r => r.present).length;
    const attPct     = attThisWeek.length
      ? `${Math.round(present / attThisWeek.length * 100)}%`
      : '—';

    const visits     = records.filter(r => r.type === 'visit');
    const needsVisit = students.filter(s => {
      const latest = visits
        .filter(v => v.studentId === s.id)
        .map(v => new Date(v.date))
        .sort((a, b) => b - a)[0];
      return !latest || latest < threshold;
    }).length;

    Utils.html('home-stats', `
      <div class="stat-card">
        <div class="stat-card__num">${students.length}</div>
        <div class="stat-card__lbl">إجمالي الأولاد</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__num">${attPct}</div>
        <div class="stat-card__lbl">حضور هذا الأسبوع</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__num">${needsVisit}</div>
        <div class="stat-card__lbl">ينتظر افتقاد</div>
      </div>
    `);
  };

  const _logout = () => {
    State.setUser(null);
    Router.go('login');
  };

  Router.onEnter('home', _render);

  return { init };
})();
