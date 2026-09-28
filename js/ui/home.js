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
    Utils.on('btn-mass',        'click', () => Router.go('mass'));
    Utils.on('btn-events',      'click', () => Router.go('events'));
    Utils.on('btn-reports',     'click', () => Router.go('reports'));
    Utils.on('btn-admin',       'click', () => Router.go('admin'));
    Utils.on('btn-servant-att', 'click', () => Router.go('servant-att'));

    State.on('recordsChanged',     _renderStats);
    State.on('activeClassChanged', _render);
    State.on('userChanged',        _render);

    // Lesson bell
    Utils.on('lesson-bell-btn',   'click', _openLessonModal);
    Utils.on('lesson-modal-close','click', _closeLessonModal);
    Utils.on('lesson-modal-overlay','click', e => {
      if (e.target.id === 'lesson-modal-overlay') _closeLessonModal();
    });
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
    Utils.el('admin-btn-wrap').style.display      = isAdmin ? '' : 'none';
    Utils.el('class-switcher-wrap').style.display = isAdmin ? '' : 'none';

    if (isAdmin) _buildClassSwitcher();

    _renderStats();
    _renderBirthdayBanner();
    _checkLesson();
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

  // ── Birthday banner ────────────────────────
  // Shows students whose birthday is this month,
  // filtered to the servant's own class (admin sees all).
  const _renderBirthdayBanner = () => {
    const user     = State.get('user');
    const students = State.getMyStudents();   // respects active class
    const now      = new Date();
    const thisMonth = now.getMonth();  // 0-based
    const today     = now.getDate();

    // Collect birthdays this month, sorted by day
    const upcoming = students
      .filter(s => {
        if (!s.birthday) return false;
        const d = new Date(s.birthday + 'T00:00:00');
        return !isNaN(d) && d.getMonth() === thisMonth;
      })
      .map(s => {
        const d   = new Date(s.birthday + 'T00:00:00');
        const day = d.getDate();
        const cls = State.getClassById(s.cls);
        return { name: s.name, day, clsName: cls?.name ?? '' };
      })
      .sort((a, b) => a.day - b.day);

    const banner = Utils.el('home-birthday-banner');
    if (!banner) return;

    if (upcoming.length === 0) {
      banner.innerHTML = '';
      return;
    }

    const isAdmin = user?.role === 'admin';

    const rows = upcoming.map(b => {
      const isToday = b.day === today;
      const isPast  = b.day < today;
      const tag     = isToday
        ? '<span class="bd-tag bd-tag--today">🎉 اليوم</span>'
        : isPast
          ? '<span class="bd-tag bd-tag--past">مضى</span>'
          : `<span class="bd-tag">يوم ${b.day}</span>`;

      return `
        <div class="bd-row ${isToday ? 'bd-row--today' : ''}">
          <span class="bd-row__name">${b.name.split(' ').slice(0, 2).join(' ')}</span>
          ${isAdmin ? `<span class="bd-row__cls">${b.clsName}</span>` : ''}
          ${tag}
        </div>`;
    }).join('');

    const monthName = now.toLocaleDateString('ar-EG', { month: 'long' });

    banner.innerHTML = `
      <div class="birthday-card">
        <div class="birthday-card__header">
          🎂 أعياد ميلاد ${monthName}
          <span class="birthday-card__count">${upcoming.length}</span>
        </div>
        <div class="birthday-card__list">
          ${rows}
        </div>
      </div>`;
  };
  // ──────────────────────────────────────────

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

  // ── Lesson bell ───────────────────────────
  let _currentLesson = null;

  const _checkLesson = async () => {
    const user = State.get('user');
    if (!user) return;

    const wk = Utils.weekKey();
    try {
      _currentLesson = await Notifications.getLatestLesson(wk);
    } catch(e) {
      _currentLesson = null;
    }

    const btn = Utils.el('lesson-bell-btn');
    if (!btn) return;

    if (_currentLesson) {
      btn.style.display = '';
      btn.classList.add('lesson-bell-btn--active');
    } else {
      btn.style.display = 'none';
      btn.classList.remove('lesson-bell-btn--active');
    }
  };

  const _openLessonModal = () => {
    if (!_currentLesson) return;
    const overlay = Utils.el('lesson-modal-overlay');
    if (!overlay) return;

    Utils.el('lesson-modal-week').textContent  = Utils.weekLabel(_currentLesson.week ?? Utils.weekKey());
    Utils.el('lesson-modal-title').textContent = _currentLesson.title ?? 'درس هذا الأسبوع';
    Utils.el('lesson-modal-by').textContent    = _currentLesson.by ? `رفعه: ${_currentLesson.by}` : '';

    const link = Utils.el('lesson-modal-link');
    if (link) {
      link.href = _currentLesson.driveUrl ?? CONFIG.drive.lessonFolderUrl;
    }

    overlay.classList.remove('hidden');
  };

  const _closeLessonModal = () => {
    Utils.el('lesson-modal-overlay')?.classList.add('hidden');
  };
  // ──────────────────────────────────────────

  const _logout = () => { State.setUser(null); Router.go('login'); };

  Router.onEnter('home', _render);

  return { init };
})();
