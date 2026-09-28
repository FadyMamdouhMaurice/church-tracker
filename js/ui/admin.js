// ─────────────────────────────────────────────
//  ui/admin.js  —  Admin dashboard
// ─────────────────────────────────────────────

const AdminScreen = (() => {
  let _activeTab = 'overview';

  const init = () => {
    Utils.on('admin-back', 'click', () => Router.back());
    Utils.on('tab-overview',  'click', () => _switchTab('overview'));
    Utils.on('tab-att',       'click', () => _switchTab('attendance'));
    Utils.on('tab-followup',  'click', () => _switchTab('followup'));
    Utils.on('tab-classes',   'click', () => _switchTab('classes'));
    Utils.on('export-csv-btn','click', () => Sheets.exportCSV());
  };

  const _onEnter = () => _switchTab('overview');

  const _switchTab = (tab) => {
    _activeTab = tab;
    ['overview','attendance','followup','classes'].forEach(t => {
      Utils.el(`tab-${t === 'attendance' ? 'att' : t}`)
        ?.classList.toggle('active', t === tab);
      Utils.el(`admin-${t}`)
        ?.style.setProperty('display', t === tab ? '' : 'none');
    });

    const renders = {
      overview:   _renderOverview,
      attendance: _renderAttendance,
      followup:   _renderFollowup,
      classes:    _renderClasses,
    };
    renders[tab]?.();
  };

  // ── Overview ──────────────────────────────
  const _renderOverview = () => {
    const records  = State.get('records');
    const students = State.get('students');
    const classes  = State.get('classes');
    const wk       = Utils.weekKey();

    const attThisWeek = records.filter(r => r.type === 'attendance' && r.week === wk);
    const present     = attThisWeek.filter(r => r.present).length;
    const pct         = attThisWeek.length ? Math.round(present / attThisWeek.length * 100) : 0;
    const servants    = [...new Set(records.map(r => r.by).filter(Boolean))];

    const classStats = classes.map(c => {
      const st  = students.filter(s => s.cls === c.id);
      const att = attThisWeek.filter(r => st.some(s => s.id === r.studentId));
      const pr  = att.filter(r => r.present).length;
      const p   = att.length ? Math.round(pr / att.length * 100) : 0;
      return { name: c.name, total: st.length, present: pr, recorded: att.length, pct: p };
    });

    Utils.html('admin-overview', `
      <div class="big-stat">
        <div class="big-stat__num">${pct}%</div>
        <div class="big-stat__lbl">الحضور الإجمالي هذا الأسبوع — ${present} من ${attThisWeek.length} مُسجَّل</div>
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
      </div>

      <div class="stats-grid stats-grid--2">
        <div class="stat-card">
          <div class="stat-card__num">${students.length}</div>
          <div class="stat-card__lbl">إجمالي الأولاد</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__num">${servants.length}</div>
          <div class="stat-card__lbl">خدام نشطين</div>
        </div>
      </div>

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
        </div>`).join('')}

      <button class="export-btn" id="export-csv-btn">⬇️ تصدير تقرير CSV</button>
    `);

    // Re-wire export button after render
    Utils.on('export-csv-btn', 'click', () => Sheets.exportCSV());
  };

  // ── Attendance report ─────────────────────
  const _renderAttendance = () => {
    const weeks    = Array.from({ length: 6 }, (_, i) => Utils.weekKey(-i));
    const records  = State.get('records').filter(r => r.type === 'attendance');
    const students = State.get('students');
    const classes  = State.get('classes');

    const rows = students.map(s => {
      const data     = weeks.map(w => records.find(r => r.studentId === s.id && r.week === w));
      const recorded = data.filter(Boolean).length;
      const present  = data.filter(d => d?.present).length;
      const pct      = recorded ? Math.round(present / recorded * 100) : null;
      return { s, data, pct };
    }).sort((a, b) => (a.pct ?? -1) - (b.pct ?? -1));

    const cls = s => classes.find(c => c.id === s.cls)?.name.replace('فصل ', '') ?? '';
    const color = pct => pct === null ? '#999' : pct < 50 ? 'var(--red)' : pct < 75 ? 'var(--orange)' : 'var(--green)';

    Utils.html('admin-attendance', `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الفصل</th>
              ${weeks.slice(0, 4).map(w => `<th>${w.slice(5)}</th>`).join('')}
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(({ s, data, pct }) => `
              <tr class="${pct !== null && pct < 50 ? 'row--alert' : ''}"
                  data-id="${s.id}" style="cursor:pointer">
                <td>${s.name.split(' ').slice(0, 2).join(' ')}</td>
                <td class="td--muted">${cls(s)}</td>
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

  // ── Follow-up report ──────────────────────
  const _renderFollowup = () => {
    const records  = State.get('records');
    const students = State.get('students');
    const classes  = State.get('classes');

    const rows = students.map(s => {
      const visits = records.filter(r => r.type === 'visit' && r.studentId === s.id)
        .sort((a, b) => b.date.localeCompare(a.date));
      const calls  = records.filter(r => r.type === 'call'  && r.studentId === s.id)
        .sort((a, b) => b.date.localeCompare(a.date));
      return {
        s,
        vd: visits[0] ? Utils.daysSince(visits[0].date) : 999,
        cd: calls[0]  ? Utils.daysSince(calls[0].date)  : 999,
      };
    }).sort((a, b) => b.vd - a.vd);

    const cls   = s => classes.find(c => c.id === s.cls)?.name.replace('فصل ', '') ?? '';
    const vColor = d => d > CONFIG.followup.visitWarningDays ? 'var(--red)' : 'var(--green)';
    const cColor = d => d > CONFIG.followup.callWarningDays  ? 'var(--red)' : 'var(--green)';
    const vText  = d => d === 999 ? 'لم يُفتقد' : `${d} يوم`;
    const cText  = d => d === 999 ? 'لم يُتصل'  : `${d} يوم`;

    Utils.html('admin-followup', `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>الاسم</th><th>الفصل</th><th>آخر افتقاد</th><th>آخر مكالمة</th></tr>
          </thead>
          <tbody>
            ${rows.map(({ s, vd, cd }) => `
              <tr class="${vd > CONFIG.followup.visitWarningDays || cd > CONFIG.followup.callWarningDays ? 'row--alert' : ''}"
                  data-id="${s.id}" style="cursor:pointer">
                <td>${s.name.split(' ').slice(0, 2).join(' ')}</td>
                <td class="td--muted">${cls(s)}</td>
                <td style="color:${vColor(vd)}">${vText(vd)}</td>
                <td style="color:${cColor(cd)}">${cText(cd)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p class="table-note">🔴 افتقاد +${CONFIG.followup.visitWarningDays} يوم أو مكالمة +${CONFIG.followup.callWarningDays} يوم</p>
    `);

    Utils.el('admin-followup')?.addEventListener('click', e => {
      const row = e.target.closest('tr[data-id]');
      if (row) ProfileScreen.open(parseInt(row.dataset.id, 10));
    });
  };

  // ── Classes list ──────────────────────────
  const _renderClasses = () => {
    const classes  = State.get('classes');
    const students = State.get('students');

    Utils.html('admin-classes', `
      <h3 class="section-title">الفصول</h3>
      ${classes.map(c => {
        const count = students.filter(s => s.cls === c.id).length;
        return `
          <div class="class-row" data-class="${c.id}">
            <div class="class-row__bar"></div>
            <div class="class-row__info">
              <div class="class-row__name">${c.name}</div>
              <div class="class-row__count">${count} ولد</div>
            </div>
            <span class="class-row__arrow">←</span>
          </div>`;
      }).join('')}
    `);

    Utils.el('admin-classes')?.addEventListener('click', e => {
      const row = e.target.closest('.class-row');
      if (!row) return;
      const classId = row.dataset.class;
      // Override student list to show this class
      const cls = State.getClassById(classId);
      Router.go('students', 'profile');
      Utils.el('students-title').textContent = cls?.name ?? 'الأولاد';
      // Temporarily filter to this class
      const list = State.get('students').filter(s => s.cls === classId);
      Utils.html('student-list', list.map(s => `
        <div class="student-card" data-id="${s.id}">
          <div class="student-card__avatar">${Utils.initials(s.name)}</div>
          <div class="student-card__info">
            <div class="student-card__name">${s.name}</div>
            <div class="student-card__meta">${Utils.truncate(s.address, 48)}</div>
          </div>
          ${UI.statusDots(s.id)}
        </div>`).join(''));
    });
  };

  Router.onEnter('admin', _onEnter);

  return { init };
})();
