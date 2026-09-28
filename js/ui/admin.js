// ─────────────────────────────────────────────
//  ui/admin.js  —  Admin dashboard
// ─────────────────────────────────────────────

const AdminScreen = (() => {
  let _activeTab   = 'overview';
  let _filterClass = '__all__';

  const init = () => {
    Utils.on('admin-back',         'click', () => Router.back());
    Utils.on('tab-overview',       'click', () => _switchTab('overview'));
    Utils.on('tab-att',            'click', () => _switchTab('attendance'));
    Utils.on('tab-followup',       'click', () => _switchTab('followup'));
    Utils.on('tab-servants',       'click', () => _switchTab('servants'));
    Utils.on('tab-birthdays',      'click', () => _switchTab('birthdays'));
    Utils.on('admin-class-filter', 'change', _onFilterChange);
    Utils.on('export-csv-btn',     'click', () => Sheets.exportCSV());
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
    _renderTab(_activeTab);
  };

  const _filteredStudents = () => {
    const all = State.get('students');
    return _filterClass === '__all__' ? all : all.filter(s => s.cls === _filterClass);
  };

  const _switchTab = (tab) => {
    _activeTab = tab;
    const tabBtnId  = { overview:'tab-overview', attendance:'tab-att',
                        followup:'tab-followup',  servants:'tab-servants',
                        birthdays:'tab-birthdays' };
    const contentId = { overview:'admin-overview', attendance:'admin-attendance',
                        followup:'admin-followup',  servants:'admin-servants',
                        birthdays:'admin-birthdays' };
    Object.keys(tabBtnId).forEach(t => {
      Utils.el(tabBtnId[t])?.classList.toggle('active', t === tab);
      Utils.el(contentId[t])?.style.setProperty('display', t === tab ? '' : 'none');
    });
    _renderTab(tab);
  };

  const _renderTab = (tab) => {
    ({ overview:_renderOverview, attendance:_renderAttendance,
       followup:_renderFollowup, servants:_renderServants,
       birthdays:_renderBirthdays })[tab]?.();
  };

  // ── helpers ───────────────────────────────
  const _clsShort = s => State.getClassById(s.cls)?.name?.replace('فصل ','') ?? '';
  const _color    = p => p === null ? '#999' : p < 50 ? 'var(--red)' : p < 75 ? 'var(--orange)' : 'var(--green)';

  // ── Overview ──────────────────────────────
  const _renderOverview = () => {
    const records  = State.get('records');
    const students = _filteredStudents();
    const wk       = Utils.weekKey();
    const attWk    = records.filter(r =>
      r.type==='attendance' && r.week===wk && students.some(s=>s.id===r.studentId));
    const present  = attWk.filter(r=>r.present).length;
    const pct      = attWk.length ? Math.round(present/attWk.length*100) : 0;
    const servants = [...new Set(records.map(r=>r.by).filter(Boolean))];

    const classStats = CONFIG.classes.map(c => {
      const st  = State.get('students').filter(s=>s.cls===c.id);
      const att = records.filter(r=>r.type==='attendance'&&r.week===wk&&st.some(s=>s.id===r.studentId));
      const pr  = att.filter(r=>r.present).length;
      const p   = att.length ? Math.round(pr/att.length*100) : 0;
      return { ...c, total:st.length, present:pr, pct:p };
    });

    Utils.html('admin-overview', `
      <div class="big-stat">
        <div class="big-stat__num">${pct}%</div>
        <div class="big-stat__lbl">الحضور الإجمالي هذا الأسبوع — ${present} من ${attWk.length} مُسجَّل</div>
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
      </div>
      <div class="stats-grid stats-grid--2">
        <div class="stat-card"><div class="stat-card__num">${students.length}</div><div class="stat-card__lbl">إجمالي الأولاد</div></div>
        <div class="stat-card"><div class="stat-card__num">${servants.length}</div><div class="stat-card__lbl">خدام نشطين</div></div>
      </div>
      ${_filterClass==='__all__' ? `
        <h3 class="section-title">الحضور بالفصل</h3>
        <div class="class-stat-rows-grid">
        ${classStats.map(c=>`
          <div class="class-stat-row">
            <div class="class-stat-row__header">
              <span>${c.name}</span>
              <span class="class-stat-row__count">${c.present}/${c.total} — ${c.pct}%</span>
            </div>
            <div class="progress-bar progress-bar--sm">
              <div class="progress-bar__fill" style="width:${c.pct}%"></div>
            </div>
          </div>`).join('')}
        </div>` : ''}
      <button class="export-btn" id="export-csv-btn">⬇️ تصدير تقرير CSV</button>
    `);
    Utils.on('export-csv-btn','click',()=>Sheets.exportCSV());
  };

  // ── Attendance — mobile cards ─────────────
  const _renderAttendance = () => {
    const weeks    = Array.from({length:6},(_,i)=>Utils.weekKey(-i));
    const attRecs  = State.get('records').filter(r=>r.type==='attendance');
    const students = _filteredStudents();

    const rows = students.map(s => {
      const data     = weeks.map(w=>attRecs.find(r=>r.studentId===s.id&&r.week===w));
      const recorded = data.filter(Boolean).length;
      const present  = data.filter(d=>d?.present).length;
      const pct      = recorded ? Math.round(present/recorded*100) : null;
      return {s,data,pct};
    }).sort((a,b)=>(a.pct??-1)-(b.pct??-1));

    Utils.html('admin-attendance', `
      <div class="m-list">
        ${rows.map(({s,data,pct})=>`
          <div class="m-card ${pct!==null&&pct<50?'m-card--alert':''}" data-id="${s.id}">
            <div class="m-card__top">
              <div class="m-card__avatar">${Utils.initials(s.name)}</div>
              <div class="m-card__info">
                <div class="m-card__name">${s.name.split(' ').slice(0,2).join(' ')}</div>
                ${_filterClass==='__all__'?`<div class="m-card__sub">${_clsShort(s)}</div>`:''}
              </div>
              <div class="m-card__badge" style="color:${_color(pct)}">${pct===null?'—':pct+'%'}</div>
            </div>
            <div class="m-card__weeks">
              ${data.slice(0,6).map((d,i)=>`
                <div class="m-week-dot" title="${weeks[i].slice(5)}">
                  <span>${d?(d.present?'✅':'❌'):'—'}</span>
                  <span class="m-week-dot__label">${weeks[i].slice(5,10)}</span>
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
      <p class="table-note">🔴 أقل من 50% حضور</p>
    `);
    Utils.el('admin-attendance')?.addEventListener('click',e=>{
      const c=e.target.closest('[data-id]');
      if(c) ProfileScreen.open(parseInt(c.dataset.id,10));
    });
  };

  // ── Follow-up — mobile cards ──────────────
  const _renderFollowup = () => {
    const records  = State.get('records');
    const students = _filteredStudents();

    const rows = students.map(s => {
      const visits = records.filter(r=>r.type==='visit'&&r.studentId===s.id).sort((a,b)=>b.date.localeCompare(a.date));
      const calls  = records.filter(r=>r.type==='call' &&r.studentId===s.id).sort((a,b)=>b.date.localeCompare(a.date));
      return { s,
        vd: visits[0] ? Utils.daysSince(visits[0].date) : 999,
        cd: calls[0]  ? Utils.daysSince(calls[0].date)  : 999,
        vBy: visits[0]?.by??'—', cBy: calls[0]?.by??'—' };
    }).sort((a,b)=>b.vd-a.vd);

    const vColor = d => d>CONFIG.followup.visitWarningDays?'var(--red)':'var(--green)';
    const cColor = d => d>CONFIG.followup.callWarningDays ?'var(--red)':'var(--green)';

    Utils.html('admin-followup', `
      <div class="m-list">
        ${rows.map(({s,vd,cd,vBy,cBy})=>`
          <div class="m-card ${(vd>CONFIG.followup.visitWarningDays||cd>CONFIG.followup.callWarningDays)?'m-card--alert':''}" data-id="${s.id}">
            <div class="m-card__top">
              <div class="m-card__avatar">${Utils.initials(s.name)}</div>
              <div class="m-card__info">
                <div class="m-card__name">${s.name.split(' ').slice(0,2).join(' ')}</div>
                ${_filterClass==='__all__'?`<div class="m-card__sub">${_clsShort(s)}</div>`:''}
              </div>
            </div>
            <div class="m-card__stats2">
              <div class="m-stat">
                <span class="m-stat__icon">🏠</span>
                <span class="m-stat__val" style="color:${vColor(vd)}">${vd===999?'لم يُفتقد':vd+' يوم'}</span>
                <span class="m-stat__by">${vd===999?'':vBy}</span>
              </div>
              <div class="m-stat">
                <span class="m-stat__icon">📞</span>
                <span class="m-stat__val" style="color:${cColor(cd)}">${cd===999?'لم يُتصل':cd+' يوم'}</span>
                <span class="m-stat__by">${cd===999?'':cBy}</span>
              </div>
            </div>
          </div>`).join('')}
      </div>
      <p class="table-note">🔴 افتقاد +${CONFIG.followup.visitWarningDays} يوم / مكالمة +${CONFIG.followup.callWarningDays} يوم</p>
    `);
    Utils.el('admin-followup')?.addEventListener('click',e=>{
      const c=e.target.closest('[data-id]');
      if(c) ProfileScreen.open(parseInt(c.dataset.id,10));
    });
  };

  // ── Servants — mobile cards ───────────────
  const _renderServants = () => {
    const records     = State.get('records');
    const allServants = CONFIG.classes.flatMap(c=>c.servants.map(name=>({name,classId:c.id,className:c.name})));

    const stats = allServants.map(srv => {
      const mine     = records.filter(r=>r.by===srv.name);
      const att      = mine.filter(r=>r.type==='attendance').length;
      const call     = mine.filter(r=>r.type==='call').length;
      const vis      = mine.filter(r=>r.type==='visit').length;
      const last     = [...mine].sort((a,b)=>b.date.localeCompare(a.date))[0];
      const sAtt     = records.filter(r=>r.type==='servant-attendance'&&r.servantName===srv.name);
      const sPresent = sAtt.filter(r=>r.present).length;
      const sExcused = sAtt.filter(r=>!r.present&&r.excused).length;
      const sPct     = sAtt.length ? Math.round(sPresent/sAtt.length*100) : null;
      return {...srv, total:mine.length, att, call, vis, lastDate:last?.date??null, sPct, sExcused};
    }).sort((a,b)=>b.total-a.total);

    const filtered = _filterClass==='__all__' ? stats : stats.filter(s=>s.classId===_filterClass);

    Utils.html('admin-servants', `
      <div class="m-list">
        ${filtered.map(s=>`
          <div class="m-card ${s.total===0?'m-card--alert':''}">
            <div class="m-card__top">
              <div class="m-card__avatar m-card__avatar--servant">${s.name[0]}</div>
              <div class="m-card__info">
                <div class="m-card__name">${s.name}</div>
                ${_filterClass==='__all__'?`<div class="m-card__sub">${s.className.replace('فصل','').trim()}</div>`:''}
              </div>
              <div class="m-card__badge" style="color:${_color(s.sPct)}">${s.sPct===null?'—':s.sPct+'%'}</div>
            </div>
            <div class="m-card__chips">
              <span class="m-chip m-chip--green">📋 ${s.att}</span>
              <span class="m-chip m-chip--orange">📞 ${s.call}</span>
              <span class="m-chip m-chip--purple">🏠 ${s.vis}</span>
              ${s.sExcused>0?`<span class="m-chip m-chip--muted">بعذر ${s.sExcused}</span>`:''}
              <span class="m-chip ${s.total>0?'m-chip--blue':'m-chip--red'}">مجموع ${s.total}</span>
            </div>
            ${s.lastDate?`<div class="m-card__last">آخر نشاط: ${Utils.formatDate(s.lastDate)}</div>`:'<div class="m-card__last m-card__last--none">لا يوجد نشاط</div>'}
          </div>`).join('')}
      </div>
      <p class="table-note">🔴 خادم لم يُسجل أي نشاط بعد</p>
    `);
  };

  // ── Birthdays — mobile cards ──────────────
  const _renderBirthdays = () => {
    const students = _filteredStudents();
    const now      = new Date();

    const withBd = students.map(s => {
      if (!s.birthday) return null;
      const d = new Date(s.birthday + 'T00:00:00');
      if (isNaN(d)) return null;
      return { s, month:d.getMonth()+1, day:d.getDate(), year:d.getFullYear(), d };
    }).filter(Boolean);

    const noBd = students.filter(s => !withBd.find(x=>x.s.id===s.id));

    // Weekly — next 7 days
    const weekItems = [];
    for (let i=0; i<=6; i++) {
      const t = new Date(now); t.setDate(now.getDate()+i);
      const tm=t.getMonth()+1, td=t.getDate();
      withBd.forEach(b => {
        if (b.month===tm && b.day===td)
          weekItems.push({...b, offset:i, age:now.getFullYear()-b.year});
      });
    }

    const thisMonth     = now.getMonth()+1;
    const nextMonthNum  = thisMonth===12?1:thisMonth+1;
    const monthItems    = withBd.filter(b=>b.month===thisMonth)
                                .map(b=>({...b, age:now.getFullYear()-b.year}))
                                .sort((a,b)=>a.day-b.day);
    const nextMonItems  = withBd.filter(b=>b.month===nextMonthNum)
                                .map(b=>({...b, age:now.getFullYear()-b.year+(thisMonth===12?1:0)}))
                                .sort((a,b)=>a.day-b.day);

    const monthName = m => new Date(2000,m-1,1).toLocaleDateString('ar-EG',{month:'long'});
    const dayLabel  = offset => offset===0?'🎉 اليوم':offset===1?'غداً':`بعد ${offset} أيام`;

    const bdCard = (b, showOffset=false) => `
      <div class="m-card" data-id="${b.s.id}">
        <div class="m-card__top">
          <div class="m-card__avatar m-card__avatar--bd">${Utils.initials(b.s.name)}</div>
          <div class="m-card__info">
            <div class="m-card__name">${b.s.name.split(' ').slice(0,2).join(' ')}</div>
            ${_filterClass==='__all__'?`<div class="m-card__sub">${_clsShort(b.s)}</div>`:''}
          </div>
          <div class="m-card__right">
            ${showOffset
              ? `<span class="bd-tag ${b.offset===0?'bd-tag--today':''}">${dayLabel(b.offset)}</span>`
              : `<span class="bd-tag">يوم ${b.day}</span>`}
            <div class="m-card__age">${b.age} سنة</div>
          </div>
        </div>
      </div>`;

    const section = (icon, title, count, items, showOffset=false, emptyMsg='لا توجد أعياد ميلاد') => `
      <div class="bd-section">
        <div class="bd-section__header">
          ${icon} ${title}
          <span class="birthday-card__count">${count}</span>
        </div>
        ${items.length===0
          ? `<p class="bd-empty">${emptyMsg}</p>`
          : `<div class="m-list m-list--inset">${items.map(b=>bdCard(b,showOffset)).join('')}</div>`}
      </div>`;

    Utils.html('admin-birthdays', `
      ${section('📅','هذا الأسبوع (7 أيام)', weekItems.length, weekItems, true, 'لا توجد أعياد ميلاد هذا الأسبوع')}
      ${section('🗓️', monthName(thisMonth)+' — هذا الشهر', monthItems.length, monthItems, false, 'لا توجد أعياد ميلاد هذا الشهر')}
      ${section('⏭️', monthName(nextMonthNum)+' — الشهر القادم', nextMonItems.length, nextMonItems, false, 'لا توجد أعياد ميلاد الشهر القادم')}
      ${noBd.length>0 ? `
        <div class="bd-section bd-section--muted">
          <div class="bd-section__header">⚠️ بدون تاريخ ميلاد
            <span class="birthday-card__count">${noBd.length}</span>
          </div>
          <div class="m-list m-list--inset">
            ${noBd.map(s=>`
              <div class="m-card" data-id="${s.id}">
                <div class="m-card__top">
                  <div class="m-card__avatar">${Utils.initials(s.name)}</div>
                  <div class="m-card__info">
                    <div class="m-card__name">${s.name.split(' ').slice(0,2).join(' ')}</div>
                    ${_filterClass==='__all__'?`<div class="m-card__sub">${_clsShort(s)}</div>`:''}
                  </div>
                  <span class="bd-tag" style="background:#fee;color:var(--red)">ناقص</span>
                </div>
              </div>`).join('')}
          </div>
        </div>` : ''}
    `);

    Utils.el('admin-birthdays')?.addEventListener('click',e=>{
      const c=e.target.closest('[data-id]');
      if(c) ProfileScreen.open(parseInt(c.dataset.id,10));
    });
  };

  Router.onEnter('admin', _onEnter);
  return { init };
})();
