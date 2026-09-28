// ─────────────────────────────────────────────
//  ui/reports.js  —  Reports screen (admin only)
//  Tabs: monthly | servants | classes | export
// ─────────────────────────────────────────────

const ReportsScreen = (() => {
  let _activeTab = 'monthly';

  const init = () => {
    Utils.on('reports-back',       'click', () => Router.back());
    Utils.on('rtab-monthly',       'click', () => _switchTab('monthly'));
    Utils.on('rtab-servants',      'click', () => _switchTab('servants'));
    Utils.on('rtab-classes',       'click', () => _switchTab('classes'));
    Utils.on('rtab-export',        'click', () => _switchTab('export'));
  };

  const _onEnter = () => _switchTab('monthly');

  const _switchTab = (tab) => {
    _activeTab = tab;
    ['monthly','servants','classes','export'].forEach(t => {
      Utils.el(`rtab-${t}`)?.classList.toggle('active', t === tab);
      Utils.el(`rep-${t}`)?.style.setProperty('display', t === tab ? '' : 'none');
    });
    _renderTab(tab);
  };

  const _renderTab = (tab) => {
    ({ monthly:_renderMonthly, servants:_renderServants,
       classes:_renderClasses, export:_renderExport })[tab]?.();
  };

  // ── helpers ───────────────────────────────
  const _color = p => p===null?'#999':p<50?'var(--red)':p<75?'var(--orange)':'var(--green)';

  const _monthOptions = () => {
    const opts = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const val   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const label = d.toLocaleDateString('ar-EG', { month:'long', year:'numeric' });
      opts.push(`<option value="${val}">${label}</option>`);
    }
    return opts.join('');
  };

  const _getMonthRecords = (ym) => {
    const records = State.get('records');
    return records.filter(r => r.date && r.date.startsWith(ym));
  };

  // ══════════════════════════════════════════
  //  TAB 1 — Monthly report
  // ══════════════════════════════════════════
  const _renderMonthly = () => {
    Utils.html('rep-monthly', `
      <div class="form-group" style="margin-bottom:12px">
        <label style="font-size:13px;color:var(--text-2);font-weight:600;display:block;margin-bottom:6px">الشهر</label>
        <select id="rep-month-sel" class="class-switcher-sel">${_monthOptions()}</select>
      </div>
      <div id="rep-monthly-content"></div>
    `);
    Utils.on('rep-month-sel', 'change', _calcMonthly);
    _calcMonthly();
  };

  const _calcMonthly = () => {
    const ym       = Utils.el('rep-month-sel')?.value ?? new Date().toISOString().slice(0,7);
    const recs     = _getMonthRecords(ym);
    const students = State.get('students');
    const monthLabel = new Date(ym+'-01').toLocaleDateString('ar-EG',{month:'long',year:'numeric'});

    // Attendance
    const attRecs  = recs.filter(r=>r.type==='attendance');
    const attWks   = [...new Set(attRecs.map(r=>r.week))];
    const present  = attRecs.filter(r=>r.present).length;
    const attTotal = attRecs.length;
    const attPct   = attTotal ? Math.round(present/attTotal*100) : 0;

    // Mass
    const massRecs  = recs.filter(r=>r.type==='mass-attendance'&&r.studentId);
    const massPresent = massRecs.filter(r=>r.present).length;
    const massPct   = massRecs.length ? Math.round(massPresent/massRecs.length*100) : 0;

    // Calls + Visits
    const calls  = recs.filter(r=>r.type==='call').length;
    const visits = recs.filter(r=>r.type==='visit').length;

    // Per-class breakdown
    const classStats = CONFIG.classes.map(c => {
      const sts      = students.filter(s=>s.cls===c.id);
      const cAtt     = attRecs.filter(r=>sts.some(s=>s.id===r.studentId));
      const cPresent = cAtt.filter(r=>r.present).length;
      const cPct     = cAtt.length ? Math.round(cPresent/cAtt.length*100) : null;
      const cCalls   = recs.filter(r=>r.type==='call'&&sts.some(s=>s.id===r.studentId)).length;
      const cVisits  = recs.filter(r=>r.type==='visit'&&sts.some(s=>s.id===r.studentId)).length;
      return { name:c.name, total:sts.length, cPct, cCalls, cVisits };
    });

    // Students with 0 attendance this month
    const absentAll = students.filter(s => {
      const mine = attRecs.filter(r=>r.studentId===s.id&&r.present);
      return mine.length === 0 && attWks.length > 0;
    });

    Utils.html('rep-monthly-content', `
      <div class="rep-hero">
        <div class="rep-hero__title">تقرير ${monthLabel}</div>
        <div class="rep-kpis">
          <div class="rep-kpi">
            <div class="rep-kpi__num" style="color:${_color(attPct)}">${attPct}%</div>
            <div class="rep-kpi__lbl">حضور مدارس</div>
            <div class="rep-kpi__sub">${present}/${attTotal} تسجيل</div>
          </div>
          <div class="rep-kpi">
            <div class="rep-kpi__num" style="color:${_color(massPct)}">${massPct}%</div>
            <div class="rep-kpi__lbl">حضور القداس</div>
            <div class="rep-kpi__sub">${massPresent}/${massRecs.length}</div>
          </div>
          <div class="rep-kpi">
            <div class="rep-kpi__num">${calls}</div>
            <div class="rep-kpi__lbl">مكالمة</div>
          </div>
          <div class="rep-kpi">
            <div class="rep-kpi__num">${visits}</div>
            <div class="rep-kpi__lbl">افتقاد</div>
          </div>
        </div>
      </div>

      <h3 class="section-title">الحضور بالفصل</h3>
      <div class="m-list" style="margin-bottom:14px">
        ${classStats.map(c=>`
          <div class="m-card">
            <div class="m-card__top">
              <div class="m-card__info">
                <div class="m-card__name">${c.name.replace('فصل ','')}</div>
                <div class="m-card__sub">${c.total} ولد</div>
              </div>
              <div class="m-card__badge" style="color:${_color(c.cPct)}">${c.cPct===null?'—':c.cPct+'%'}</div>
            </div>
            <div class="m-card__chips">
              <span class="m-chip m-chip--orange">📞 ${c.cCalls}</span>
              <span class="m-chip m-chip--purple">🏠 ${c.cVisits}</span>
            </div>
          </div>`).join('')}
      </div>

      ${absentAll.length > 0 ? `
        <h3 class="section-title" style="color:var(--red)">⚠️ لم يحضروا هذا الشهر (${absentAll.length})</h3>
        <div class="m-list">
          ${absentAll.map(s=>`
            <div class="m-card m-card--alert" data-id="${s.id}" style="cursor:pointer">
              <div class="m-card__top">
                <div class="m-card__avatar">${Utils.initials(s.name)}</div>
                <div class="m-card__info">
                  <div class="m-card__name">${s.name.split(' ').slice(0,2).join(' ')}</div>
                  <div class="m-card__sub">${State.getClassById(s.cls)?.name?.replace('فصل','').trim()??''}</div>
                </div>
              </div>
            </div>`).join('')}
        </div>` : ''}
    `);

    Utils.el('rep-monthly-content')?.addEventListener('click', e=>{
      const c=e.target.closest('[data-id]');
      if(c) ProfileScreen.open(parseInt(c.dataset.id,10));
    });
  };

  // ══════════════════════════════════════════
  //  TAB 2 — Servant detailed report
  // ══════════════════════════════════════════
  const _renderServants = () => {
    const servants = CONFIG.classes.flatMap(c=>c.servants.map(n=>({name:n,cls:c})));
    const records  = State.get('records');
    const now      = new Date();
    const months   = Array.from({length:3},(_,i)=>{
      const d=new Date(); d.setMonth(d.getMonth()-i);
      return d.toISOString().slice(0,7);
    });

    const stats = servants.map(srv => {
      const mine = records.filter(r=>r.by===srv.name);
      const monthBreakdown = months.map(ym => {
        const mr = mine.filter(r=>r.date?.startsWith(ym));
        return {
          ym,
          att:   mr.filter(r=>r.type==='attendance').length,
          call:  mr.filter(r=>r.type==='call').length,
          visit: mr.filter(r=>r.type==='visit').length,
        };
      });
      const sAtt    = records.filter(r=>r.type==='servant-attendance'&&r.servantName===srv.name);
      const sLesson = sAtt.filter(r=>r.lesson).length;
      const sPresent= sAtt.filter(r=>r.present).length;
      const sPct    = sAtt.length?Math.round(sPresent/sAtt.length*100):null;
      const last    = [...mine].sort((a,b)=>b.date?.localeCompare(a.date??'')??0)[0];
      return {...srv, monthBreakdown, sLesson, sPct, lastDate:last?.date??null, total:mine.length};
    }).sort((a,b)=>b.total-a.total);

    const monthNames = months.map(ym=>new Date(ym+'-01').toLocaleDateString('ar-EG',{month:'short'}));

    Utils.html('rep-servants', `
      <div class="m-list">
        ${stats.map(s=>`
          <div class="m-card ${s.total===0?'m-card--alert':''}">
            <div class="m-card__top">
              <div class="m-card__avatar m-card__avatar--servant">${s.name[0]}</div>
              <div class="m-card__info">
                <div class="m-card__name">${s.name}</div>
                <div class="m-card__sub">${s.cls.name.replace('فصل','').trim()}</div>
              </div>
              <div class="m-card__badge" style="color:${_color(s.sPct)}">${s.sPct===null?'—':s.sPct+'%'}</div>
            </div>
            <div class="rep-servant-months">
              ${s.monthBreakdown.map((m,i)=>`
                <div class="rep-month-col">
                  <div class="rep-month-col__label">${monthNames[i]}</div>
                  <div class="rep-month-col__row"><span>📋</span>${m.att}</div>
                  <div class="rep-month-col__row"><span>📞</span>${m.call}</div>
                  <div class="rep-month-col__row"><span>🏠</span>${m.visit}</div>
                </div>`).join('')}
              <div class="rep-month-col rep-month-col--lesson">
                <div class="rep-month-col__label">درس</div>
                <div class="rep-month-col__row"><span>📖</span>${s.sLesson}</div>
              </div>
            </div>
            ${s.lastDate?`<div class="m-card__last">آخر نشاط: ${Utils.formatDate(s.lastDate)}</div>`:'<div class="m-card__last m-card__last--none">لا يوجد نشاط</div>'}
          </div>`).join('')}
      </div>
    `);
  };

  // ══════════════════════════════════════════
  //  TAB 3 — Class comparison
  // ══════════════════════════════════════════
  const _renderClasses = () => {
    const records  = State.get('records');
    const students = State.get('students');
    const weeks    = Array.from({length:8},(_,i)=>Utils.weekKey(-i));

    const stats = CONFIG.classes.map(c => {
      const sts       = students.filter(s=>s.cls===c.id);
      const attRecs   = records.filter(r=>r.type==='attendance'&&sts.some(s=>s.id===r.studentId));
      const massRecs  = records.filter(r=>r.type==='mass-attendance'&&r.studentId&&sts.some(s=>s.id===r.studentId));
      const calls     = records.filter(r=>r.type==='call'&&sts.some(s=>s.id===r.studentId)).length;
      const visits    = records.filter(r=>r.type==='visit'&&sts.some(s=>s.id===r.studentId)).length;
      const attPct    = attRecs.length?Math.round(attRecs.filter(r=>r.present).length/attRecs.length*100):null;
      const massPct   = massRecs.length?Math.round(massRecs.filter(r=>r.present).length/massRecs.length*100):null;
      const lastAtt   = attRecs.filter(r=>r.week===Utils.weekKey());
      const thisWeekPct = lastAtt.length?Math.round(lastAtt.filter(r=>r.present).length/lastAtt.length*100):null;

      // Streak: how many consecutive weeks with >50% attendance
      let streak=0;
      for(const wk of weeks){
        const wa=attRecs.filter(r=>r.week===wk);
        if(!wa.length) break;
        const wp=Math.round(wa.filter(r=>r.present).length/wa.length*100);
        if(wp>=50) streak++; else break;
      }

      return {c, total:sts.length, attPct, massPct, calls, visits, thisWeekPct, streak};
    }).sort((a,b)=>(b.attPct??-1)-(a.attPct??-1));

    Utils.html('rep-classes', `
      <div class="m-list">
        ${stats.map(({c,total,attPct,massPct,calls,visits,thisWeekPct,streak})=>`
          <div class="m-card">
            <div class="m-card__top">
              <div class="m-card__info">
                <div class="m-card__name">${c.name.replace('فصل ','')}</div>
                <div class="m-card__sub">${total} ولد · ${c.servants.length} خدام</div>
              </div>
              <div style="text-align:left">
                <div class="m-card__badge" style="color:${_color(attPct)}">${attPct===null?'—':attPct+'%'}</div>
                <div style="font-size:10px;color:var(--text-2)">حضور إجمالي</div>
              </div>
            </div>
            <div class="m-card__chips">
              <span class="m-chip m-chip--blue">هذا الأسبوع: ${thisWeekPct===null?'—':thisWeekPct+'%'}</span>
              <span class="m-chip m-chip--${massPct!==null&&massPct>=50?'green':'muted'}">⛪ ${massPct===null?'—':massPct+'%'}</span>
              <span class="m-chip m-chip--orange">📞 ${calls}</span>
              <span class="m-chip m-chip--purple">🏠 ${visits}</span>
              ${streak>0?`<span class="m-chip m-chip--green">🔥 ${streak} أسبوع متواصل</span>`:''}
            </div>
          </div>`).join('')}
      </div>
    `);
  };

  // ══════════════════════════════════════════
  //  TAB 4 — Export
  // ══════════════════════════════════════════
  const _renderExport = () => {
    Utils.html('rep-export', `
      <div class="form-group">
        <label style="font-size:13px;color:var(--text-2);font-weight:600;display:block;margin-bottom:6px">الشهر</label>
        <select id="rep-exp-month" class="class-switcher-sel">${_monthOptions()}</select>
      </div>

      <div class="rep-export-grid">
        <button class="rep-export-btn" id="exp-csv-students">
          <span class="rep-export-btn__icon">📊</span>
          <span class="rep-export-btn__label">Excel — بيانات الأولاد</span>
        </button>
        <button class="rep-export-btn" id="exp-csv-monthly">
          <span class="rep-export-btn__icon">📅</span>
          <span class="rep-export-btn__label">Excel — تقرير الشهر</span>
        </button>
        <button class="rep-export-btn" id="exp-csv-servants">
          <span class="rep-export-btn__icon">🧑‍💼</span>
          <span class="rep-export-btn__label">Excel — تقرير الخدام</span>
        </button>
        <button class="rep-export-btn rep-export-btn--pdf" id="exp-pdf-monthly">
          <span class="rep-export-btn__icon">📄</span>
          <span class="rep-export-btn__label">PDF — التقرير الشهري</span>
        </button>
      </div>
    `);

    Utils.on('exp-csv-students', 'click', _exportStudentsCSV);
    Utils.on('exp-csv-monthly',  'click', _exportMonthlyCSV);
    Utils.on('exp-csv-servants', 'click', _exportServantsCSV);
    Utils.on('exp-pdf-monthly',  'click', _exportPDF);
  };

  // ── CSV exports ────────────────────────────
  const _dl = (filename, csvContent) => {
    const BOM  = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const _exportStudentsCSV = () => {
    const students = State.get('students');
    const rows = [['الاسم','الفصل','العنوان','تليفون الولد','تليفون الأم','تليفون الأب','المدرسة','وظيفة الأب','وظيفة الأم','شماس','أب الاعتراف','تاريخ الميلاد','ملاحظات']];
    students.forEach(s => {
      const cls = State.getClassById(s.cls)?.name ?? '';
      rows.push([s.name,cls,s.address,s.phones?.child??'',s.phones?.mom??'',s.phones?.dad??'',
        s.school,s.jobDad,s.jobMom,s.deacon?'✓':'',s.confessor,s.birthday??'',s.notes]);
    });
    _dl('بيانات_الاولاد.csv', rows.map(r=>r.map(c=>`"${(c??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n'));
    UI.toast('✅ تم تصدير بيانات الأولاد');
  };

  const _exportMonthlyCSV = () => {
    const ym       = Utils.el('rep-exp-month')?.value ?? new Date().toISOString().slice(0,7);
    const recs     = _getMonthRecords(ym);
    const students = State.get('students');
    const attRecs  = recs.filter(r=>r.type==='attendance');
    const calls    = recs.filter(r=>r.type==='call');
    const visits   = recs.filter(r=>r.type==='visit');
    const rows = [['الاسم','الفصل','أسابيع الحضور','نسبة الحضور','عدد المكالمات','عدد الافتقادات']];
    students.forEach(s => {
      const cls     = State.getClassById(s.cls)?.name?.replace('فصل ','') ?? '';
      const sAtt    = attRecs.filter(r=>r.studentId===s.id);
      const present = sAtt.filter(r=>r.present).length;
      const pct     = sAtt.length?Math.round(present/sAtt.length*100)+'%':'—';
      const sCalls  = calls.filter(r=>r.studentId===s.id).length;
      const sVisits = visits.filter(r=>r.studentId===s.id).length;
      rows.push([s.name,cls,present+'/'+sAtt.length,pct,sCalls,sVisits]);
    });
    _dl(`تقرير_${ym}.csv`, rows.map(r=>r.map(c=>`"${(c??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n'));
    UI.toast('✅ تم تصدير التقرير الشهري');
  };

  const _exportServantsCSV = () => {
    const records  = State.get('records');
    const rows = [['الخادم','الفصل','حضور الاجتماع','حضور الخدام%','تحضير الدرس','مكالمات','افتقادات','آخر نشاط']];
    CONFIG.classes.flatMap(c=>c.servants.map(n=>({name:n,cls:c}))).forEach(srv => {
      const mine   = records.filter(r=>r.by===srv.name);
      const sAtt   = records.filter(r=>r.type==='servant-attendance'&&r.servantName===srv.name);
      const sPct   = sAtt.length?Math.round(sAtt.filter(r=>r.present).length/sAtt.length*100)+'%':'—';
      const lesson = sAtt.filter(r=>r.lesson).length;
      const last   = [...mine].sort((a,b)=>b.date?.localeCompare(a.date??'')??0)[0];
      rows.push([srv.name,srv.cls.name.replace('فصل ',''),mine.filter(r=>r.type==='attendance').length,
        sPct,lesson,mine.filter(r=>r.type==='call').length,mine.filter(r=>r.type==='visit').length,last?.date??'—']);
    });
    _dl('تقرير_الخدام.csv', rows.map(r=>r.map(c=>`"${(c??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n'));
    UI.toast('✅ تم تصدير تقرير الخدام');
  };

  // ── PDF export ─────────────────────────────
  const _exportPDF = () => {
    const ym         = Utils.el('rep-exp-month')?.value ?? new Date().toISOString().slice(0,7);
    const monthLabel = new Date(ym+'-01').toLocaleDateString('ar-EG',{month:'long',year:'numeric'});
    const recs       = _getMonthRecords(ym);
    const students   = State.get('students');
    const attRecs    = recs.filter(r=>r.type==='attendance');
    const present    = attRecs.filter(r=>r.present).length;
    const attPct     = attRecs.length?Math.round(present/attRecs.length*100):0;
    const calls      = recs.filter(r=>r.type==='call').length;
    const visits     = recs.filter(r=>r.type==='visit').length;

    const classRows = CONFIG.classes.map(c => {
      const sts  = students.filter(s=>s.cls===c.id);
      const cAtt = attRecs.filter(r=>sts.some(s=>s.id===r.studentId));
      const cp   = cAtt.length?Math.round(cAtt.filter(r=>r.present).length/cAtt.length*100):0;
      return `<tr><td>${c.name.replace('فصل ','')}</td><td>${sts.length}</td>
              <td style="color:${cp<50?'#c0392b':cp<75?'#e67e22':'#1a7a4a'};font-weight:700">${cp}%</td>
              <td>${recs.filter(r=>r.type==='call'&&sts.some(s=>s.id===r.studentId)).length}</td>
              <td>${recs.filter(r=>r.type==='visit'&&sts.some(s=>s.id===r.studentId)).length}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;padding:30px;color:#1a2340;direction:rtl}
  h1{color:#1a3a6b;border-bottom:3px solid #1a3a6b;padding-bottom:8px}
  h2{color:#2a5298;margin-top:24px}
  .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0}
  .kpi{background:#f4f6fb;border-radius:10px;padding:16px;text-align:center}
  .kpi__num{font-size:28px;font-weight:800;color:#1a3a6b}
  .kpi__lbl{font-size:12px;color:#4a5a7a;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th{background:#1a3a6b;color:white;padding:10px;font-size:13px}
  td{padding:9px;border-bottom:1px solid #e8ecf4;font-size:13px}
  tr:nth-child(even)td{background:#f9fafb}
  .footer{margin-top:32px;font-size:11px;color:#888;text-align:center}
</style></head><body>
<h1>✝ تقرير ${monthLabel} — دفعة الأنبا موسى الأسود</h1>
<p style="color:#4a5a7a">كنيسة السيدة العذراء مريم — عزبة النخل</p>
<div class="kpis">
  <div class="kpi"><div class="kpi__num">${attPct}%</div><div class="kpi__lbl">نسبة الحضور</div></div>
  <div class="kpi"><div class="kpi__num">${present}/${attRecs.length}</div><div class="kpi__lbl">حضور / مسجَّل</div></div>
  <div class="kpi"><div class="kpi__num">${calls}</div><div class="kpi__lbl">مكالمات</div></div>
  <div class="kpi"><div class="kpi__num">${visits}</div><div class="kpi__lbl">افتقادات</div></div>
</div>
<h2>الحضور بالفصل</h2>
<table><thead><tr><th>الفصل</th><th>عدد الأولاد</th><th>نسبة الحضور</th><th>مكالمات</th><th>افتقادات</th></tr></thead>
<tbody>${classRows}</tbody></table>
<div class="footer">تقرير مُنشأ بواسطة نظام متابعة دفعة الأنبا موسى الأسود — ${new Date().toLocaleDateString('ar-EG')}</div>
</body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  Router.onEnter('reports', _onEnter);
  return { init };
})();
