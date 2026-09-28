// ─────────────────────────────────────────────
//  ui/admin.js  —  Admin dashboard
// ─────────────────────────────────────────────

const AdminScreen = (() => {
  let _activeTab    = 'overview';
  let _filterClass  = '__all__'; // class filter for all tabs

  const init = () => {
    Utils.on('admin-back',      'click', () => Router.back());
    Utils.on('tab-overview',    'click', () => _switchTab('overview'));
    Utils.on('tab-att',         'click', () => _switchTab('attendance'));
    Utils.on('tab-followup',    'click', () => _switchTab('followup'));
    Utils.on('tab-servants',    'click', () => _switchTab('servants'));
    Utils.on('admin-class-filter', 'change', _onFilterChange);
    Utils.on('export-csv-btn',  'click', () => Sheets.exportCSV());
  };

  const _onEnter = () => {
    _filterClass = '__all__';
    _buildFilter();
    _switchTab('overview');
  };

  const _buildFilter = () => {
    const sel = Utils.el('admin-class-filter');
    if (!sel) return;
    sel.innerHTML = `<option value="__all__">كل الفصول</option>
      ${CONFIG.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}`;
  };

  const _onFilterChange = () => {
    _filterClass = Utils.el('admin-class-filter').value;
    // Re-render active tab with new filter
    const renders = { overview:'overview', attendance:'attendance', followup:'followup', servants:'servants' };
    _renderTab(renders[_activeTab] ?? 'overview');
  };

  // ── Helpers ───────────────────────────────
  const _filteredStudents = () => {
    const all = State.get('students');
    return _filterClass === '__all__' ? all : all.filter(s => s.cls === _filterClass);
  };

  const _switchTab = (tab) => {
    _activeTab = tab;

    // Tab button IDs: tab-overview, tab-att, tab-followup, tab-servants
    const tabBtnId = { overview:'tab-overview', attendance:'tab-att',
                       followup:'tab-followup', servants:'tab-servants' };
    // Content div IDs: admin-overview, admin-attendance, admin-followup, admin-servants
    const contentId = { overview:'admin-overview', attendance:'admin-attendance',
                        followup:'admin-followup', servants:'admin-servants' };

    Object.keys(tabBtnId).forEach(t => {
      Utils.el(tabBtnId[t])?.classList.toggle('active', t === tab);
      Utils.el(contentId[t])?.style.setProperty('display', t === tab ? '' : 'none');
    });

    _renderTab(tab);
  };

  const _renderTab = (tab) => {
    const renders = {
      overview:   _renderOverview,
      attendance: _renderAttendance,
      followup:   _renderFollowup,
      servants:   _renderServants,
    };
    renders[tab]?.();
  };

  // ── Overview ──────────────────────────────
  const _renderOverview = () => {
    const records  = State.get('records');
    const students = _filteredStudents();
    const wk       = Utils.weekKey();

    const attThisWeek = records.filter(r =>
      r.type === 'attendance' && r.week === wk &&
      students.some(s => s.id === r.studentId)
    );
    const present  = attThisWeek.filter(r => r.present).length;
    const pct      = attThisWeek.length ? Math.round(present / attThisWeek.length * 100) : 0;
    const servants = [...new Set(records.map(r => r.by).filter(Boolean))];

    const classStats = CONFIG.classes.map(c => {
      const st  = State.get('students').filter(s => s.cls === c.id);
      const att = records.filter(r => r.type === 'attendance' && r.week === wk && st.some(s => s.id === r.studentId));
      const pr  = att.filter(r => r.present).length;
      const p   = att.length ? Math.round(pr / att.length * 100) : 0;
      return { ...c, total: st.length, present: pr, recorded: att.length, pct: p };
    });

    Utils.html('admin-overview', `
      <div class="big-stat">
        <div class="big-stat__num">${pct}%</div>
        <div class="big-stat__lbl">الحضور ${_filterClass === '__all__' ? 'الإجمالي' : ''} هذا الأسبوع
          — ${present} من ${attThisWeek.length} مُسجَّل</div>
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
      </div>
      <div class="stats-grid stats-grid--2">
        <div class="stat-card"><div class="stat-card__num">${students.length}</div><div class="stat-card__lbl">إجمالي الأولاد</div></div>
        <div class="stat-card"><div class="stat-card__num">${servants.length}</div><div class="stat-card__lbl">خدام نشطين</div></div>
      </div>
      ${_filterClass === '__all__' ? `
        <h3 class="section-title">الحضور بالفصل</h3>
        ${classStats.map(c => `
          <div class="class-stat-row">
            <div class="class-stat-row__header">
              <span>${c.name}</span>
              <span class="class-stat-row__count">${c.present}/${c.total}</span>
            </div>
            <div class="progress-bar progress-bar--sm">
              <div class="progress-bar__fill" style="width:${c.pct}%"></div>
            </div>
          </div>`).join('')}` : ''}
      <button class="export-btn" id="export-csv-btn">⬇️ تصدير تقرير CSV</button>
    `);
    Utils.on('export-csv-btn', 'click', () => Sheets.exportCSV());
  };

  // ── Attendance ────────────────────────────
  const _renderAttendance = () => {
    const weeks    = Array.from({ length: 6 }, (_, i) => Utils.weekKey(-i));
    const attRecs  = State.get('records').filter(r => r.type === 'attendance');
    const students = _filteredStudents();
    const classes  = State.get('classes');

    const rows = students.map(s => {
      const data     = weeks.map(w => attRecs.find(r => r.studentId === s.id && r.week === w));
      const recorded = data.filter(Boolean).length;
      const present  = data.filter(d => d?.present).length;
      const pct      = recorded ? Math.round(present / recorded * 100) : null;
      return { s, data, pct };
    }).sort((a, b) => (a.pct ?? -1) - (b.pct ?? -1));

    const clsName = s => State.getClassById(s.cls)?.name?.replace('فصل ', '') ?? '';
    const color   = p => p === null ? '#999' : p < 50 ? 'var(--red)' : p < 75 ? 'var(--orange)' : 'var(--green)';

    Utils.html('admin-attendance', `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              ${_filterClass === '__all__' ? '<th>الفصل</th>' : ''}
              ${weeks.slice(0, 4).map(w => `<th>${w.slice(5)}</th>`).join('')}
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(({ s, data, pct }) => `
              <tr class="${pct !== null && pct < 50 ? 'row--alert' : ''}" data-id="${s.id}" style="cursor:pointer">
                <td>${s.name.split(' ').slice(0, 2).join(' ')}</td>
                ${_filterClass === '__all__' ? `<td class="td--muted">${clsName(s)}</td>` : ''}
                ${data.slice(0, 4).map(d => `<td class="td--center">${d ? (d.present ? '✅' : '❌') : '—'}</td>`).join('')}
                <td style="font-weight:700;color:${color(pct)}">${pct === null ? '—' : pct + '%'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="table-note">🔴 أقل من 50% حضور</p>
    `);

    Utils.el('admin-attendance')?.addEventListener('click', e => {
      const row = e.target.closest('tr[data-id]');
      if (row) ProfileScreen.open(parseInt(row.dataset.id, 10));
    });
  };

  // ── Follow-up ─────────────────────────────
  const _renderFollowup = () => {
    const records  = State.get('records');
    const students = _filteredStudents();

    const rows = students.map(s => {
      const visits = records.filter(r => r.type === 'visit' && r.studentId === s.id)
        .sort((a, b) => b.date.localeCompare(a.date));
      const calls  = records.filter(r => r.type === 'call'  && r.studentId === s.id)
        .sort((a, b) => b.date.localeCompare(a.date));
      const lastV = visits[0]; const lastC = calls[0];
      return {
        s,
        vd:    lastV ? Utils.daysSince(lastV.date) : 999,
        cd:    lastC ? Utils.daysSince(lastC.date) : 999,
        vBy:   lastV?.by ?? '—',
        cBy:   lastC?.by ?? '—',
      };
    }).sort((a, b) => b.vd - a.vd);

    const clsName = s => State.getClassById(s.cls)?.name?.replace('فصل ', '') ?? '';
    const vColor  = d => d > CONFIG.followup.visitWarningDays ? 'var(--red)' : 'var(--green)';
    const cColor  = d => d > CONFIG.followup.callWarningDays  ? 'var(--red)' : 'var(--green)';

    Utils.html('admin-followup', `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              ${_filterClass === '__all__' ? '<th>الفصل</th>' : ''}
              <th>آخر افتقاد</th><th>بواسطة</th>
              <th>آخر مكالمة</th><th>بواسطة</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(({ s, vd, cd, vBy, cBy }) => `
              <tr class="${vd > CONFIG.followup.visitWarningDays || cd > CONFIG.followup.callWarningDays ? 'row--alert' : ''}"
                  data-id="${s.id}" style="cursor:pointer">
                <td>${s.name.split(' ').slice(0, 2).join(' ')}</td>
                ${_filterClass === '__all__' ? `<td class="td--muted">${clsName(s)}</td>` : ''}
                <td style="color:${vColor(vd)}">${vd === 999 ? 'لم يُفتقد' : vd + ' يوم'}</td>
                <td class="td--muted">${vd === 999 ? '—' : vBy}</td>
                <td style="color:${cColor(cd)}">${cd === 999 ? 'لم يُتصل' : cd + ' يوم'}</td>
                <td class="td--muted">${cd === 999 ? '—' : cBy}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="table-note">🔴 افتقاد +${CONFIG.followup.visitWarningDays} يوم / مكالمة +${CONFIG.followup.callWarningDays} يوم</p>
    `);

    Utils.el('admin-followup')?.addEventListener('click', e => {
      const row = e.target.closest('tr[data-id]');
      if (row) ProfileScreen.open(parseInt(row.dataset.id, 10));
    });
  };

  // ── Servant activity ──────────────────────
  const _renderServants = () => {
    const records = State.get('records');
    const allServants = CONFIG.classes.flatMap(c =>
      c.servants.map(name => ({ name, classId: c.id, className: c.name }))
    );

    const stats = allServants.map(srv => {
      const mine    = records.filter(r => r.by === srv.name);
      const att     = mine.filter(r => r.type === 'attendance').length;
      const call    = mine.filter(r => r.type === 'call').length;
      const vis     = mine.filter(r => r.type === 'visit').length;
      const last    = mine.sort((a,b) => b.date.localeCompare(a.date))[0];
      // Servant own attendance
      const sAtt     = records.filter(r => r.type === 'servant-attendance' && r.servantName === srv.name);
      const sTotal   = sAtt.length;
      const sPresent = sAtt.filter(r => r.present).length;
      const sExcused = sAtt.filter(r => !r.present && r.excused).length;
      const sPct     = sTotal ? Math.round(sPresent / sTotal * 100) : null;
      return { ...srv, total: mine.length, att, call, vis, lastDate: last?.date ?? null, sPct, sTotal, sExcused };
    }).sort((a, b) => b.total - a.total);

    const filtered = _filterClass === '__all__'
      ? stats
      : stats.filter(s => s.classId === _filterClass);

    Utils.html('admin-servants', `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>الخادم</th>
              ${_filterClass === '__all__' ? '<th>الفصل</th>' : ''}
              <th>حضور</th><th>مكالمات</th><th>افتقاد</th><th>الإجمالي</th><th>حضوره%</th><th>بعذر</th><th>آخر نشاط</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(s => `
              <tr class="${s.total === 0 ? 'row--alert' : ''}">
                <td style="font-weight:600">${s.name}</td>
                ${_filterClass === '__all__' ? `<td class="td--muted">${s.className.replace('فصل ','')}</td>` : ''}
                <td class="td--center">${s.att}</td>
                <td class="td--center">${s.call}</td>
                <td class="td--center">${s.vis}</td>
                <td class="td--center" style="font-weight:700;color:${s.total > 0 ? 'var(--green)' : 'var(--red)'}">${s.total}</td>
                <td class="td--center" style="font-weight:700;color:${s.sPct === null ? '#999' : s.sPct < 50 ? 'var(--red)' : s.sPct < 75 ? 'var(--orange)' : 'var(--green)'}">${s.sPct === null ? '—' : s.sPct + '%'}</td>
                <td class="td--center" style="color:${s.sExcused > 0 ? 'var(--orange)' : 'var(--text-2)'}">${s.sExcused || '—'}</td>
                <td class="td--muted">${s.lastDate ? Utils.formatDate(s.lastDate) : 'لا يوجد'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="table-note">🔴 خادم لم يُسجل أي نشاط بعد</p>
    `);
  };

  Router.onEnter('admin', _onEnter);

  return { init };
})();
