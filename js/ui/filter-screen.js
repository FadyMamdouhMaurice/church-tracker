// ─────────────────────────────────────────────
//  ui/filter-screen.js  —  Advanced filter + export
//  Filter students by activity, weeks, counts
//  Export results to Excel CSV
// ─────────────────────────────────────────────

const FilterScreen = (() => {

  let _results = [];

  const init = () => {
    Utils.on('filter-back', 'click', () => Router.back());
  };

  const _onEnter = () => _render();

  // ── Build the filter form ──────────────────
  const _render = () => {
    const isAdmin = State.get('user')?.role === 'admin';

    Utils.html('filter-content', `
      <!-- Filter form -->
      <div class="filter-form">

        <!-- Activity type -->
        <div class="form-group">
          <label class="filter-label">النشاط</label>
          <div class="filter-chips" id="filter-type-chips">
            ${[
              { val:'attendance',      icon:'📋', label:'مدارس الأحد' },
              { val:'mass-attendance', icon:'⛪', label:'حضور القداس' },
              { val:'call',            icon:'📞', label:'افتقاد تليفوني' },
              { val:'visit',           icon:'🏠', label:'افتقاد منزلي' },
            ].map(t => `
              <button class="filter-chip ${t.val==='attendance'?'filter-chip--active':''}"
                      data-val="${t.val}">${t.icon} ${t.label}</button>
            `).join('')}
          </div>
        </div>

        <!-- Filter mode -->
        <div class="form-group">
          <label class="filter-label">نوع الفلتر</label>
          <div class="filter-mode-tabs">
            <button class="filter-mode-tab filter-mode-tab--active" data-mode="absent" id="mode-absent">
              🚫 محضروش خلال فترة
            </button>
            <button class="filter-mode-tab" data-mode="count" id="mode-count">
              🔢 عدد المرات
            </button>
          </div>
        </div>

        <!-- Absent mode -->
        <div id="absent-options">
          <div class="form-group">
            <label class="filter-label">الفترة</label>
            <div class="filter-period-row">
              <select id="filter-period-type" class="class-switcher-sel" style="flex:1">
                <option value="weeks">آخر X أسبوع</option>
                <option value="date">من تاريخ معين</option>
              </select>
            </div>
          </div>
          <div id="filter-weeks-wrap" class="form-group">
            <label class="filter-label">عدد الأسابيع</label>
            <input id="filter-weeks" type="number" min="1" max="52" value="4"
                   style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:15px;font-family:inherit;outline:none">
          </div>
          <div id="filter-date-wrap" class="form-group" style="display:none">
            <label class="filter-label">من تاريخ</label>
            <input id="filter-from-date" type="date"
                   style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:15px;font-family:inherit;outline:none">
          </div>
        </div>

        <!-- Count mode -->
        <div id="count-options" style="display:none">
          <div class="form-group">
            <label class="filter-label">الشرط</label>
            <div style="display:flex;gap:8px;align-items:center">
              <select id="filter-count-op" class="class-switcher-sel" style="flex:1">
                <option value="lt">أقل من</option>
                <option value="gt">أكتر من</option>
                <option value="eq">يساوي</option>
              </select>
              <input id="filter-count-val" type="number" min="0" max="999" value="3"
                     style="width:90px;padding:10px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:15px;font-family:inherit;outline:none">
              <span style="font-size:13px;color:var(--text-2);white-space:nowrap">مرة</span>
            </div>
          </div>
          <div class="form-group">
            <label class="filter-label">خلال</label>
            <select id="filter-count-period" class="class-switcher-sel">
              <option value="0">كل الوقت</option>
              <option value="4">آخر 4 أسابيع</option>
              <option value="8">آخر 8 أسابيع</option>
              <option value="12">آخر 12 أسبوع</option>
              <option value="24">آخر 6 أشهر</option>
            </select>
          </div>
        </div>

        ${isAdmin ? `
        <!-- Class filter (admin only) -->
        <div class="form-group">
          <label class="filter-label">الفصل</label>
          <select id="filter-class" class="class-switcher-sel">
            <option value="__all__">كل الفصول</option>
            ${CONFIG.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>` : ''}

        <button class="btn btn--primary" id="filter-run" style="width:100%;padding:13px;font-size:15px">
          🔍 تطبيق الفلتر
        </button>
      </div>

      <!-- Results -->
      <div id="filter-results" style="margin-top:8px"></div>
    `);

    // Wire run button (must be after HTML is rendered)
    Utils.on('filter-run', 'click', _run);

    // Wire chips
    Utils.el('filter-type-chips')?.addEventListener('click', e => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      Utils.el('filter-type-chips').querySelectorAll('.filter-chip')
        .forEach(c => c.classList.remove('filter-chip--active'));
      chip.classList.add('filter-chip--active');
    });

    // Wire mode tabs
    ['absent','count'].forEach(mode => {
      Utils.el(`mode-${mode}`)?.addEventListener('click', () => {
        ['absent','count'].forEach(m => {
          Utils.el(`mode-${m}`)?.classList.toggle('filter-mode-tab--active', m === mode);
          Utils.el(`${m}-options`).style.display = m === mode ? '' : 'none';
        });
      });
    });

    // Wire period type toggle
    Utils.el('filter-period-type')?.addEventListener('change', function() {
      Utils.el('filter-weeks-wrap').style.display = this.value === 'weeks' ? '' : 'none';
      Utils.el('filter-date-wrap').style.display  = this.value === 'date'  ? '' : 'none';
    });
  };

  // ── Run filter ─────────────────────────────
  const _run = () => {
    const type   = Utils.el('filter-type-chips')?.querySelector('.filter-chip--active')?.dataset.val ?? 'attendance';
    const isAdmin = State.get('user')?.role === 'admin';
    const clsFilter = isAdmin ? (Utils.el('filter-class')?.value ?? '__all__') : State.get('user')?.classId;

    // Determine mode
    const isCountMode = Utils.el('mode-count')?.classList.contains('filter-mode-tab--active');
    const students    = State.get('students').filter(s =>
      clsFilter === '__all__' || s.cls === clsFilter
    );
    const records  = State.get('records');

    if (isCountMode) {
      _runCountFilter(students, records, type);
    } else {
      _runAbsentFilter(students, records, type);
    }
  };

  const _runAbsentFilter = (students, records, type) => {
    const periodType = Utils.el('filter-period-type')?.value ?? 'weeks';
    let fromDate;

    if (periodType === 'weeks') {
      const weeks  = parseInt(Utils.el('filter-weeks')?.value ?? '4', 10);
      fromDate     = new Date();
      fromDate.setDate(fromDate.getDate() - weeks * 7);
    } else {
      const raw = Utils.el('filter-from-date')?.value;
      if (!raw) { UI.toast('اختار تاريخ البداية'); return; }
      fromDate = new Date(raw + 'T00:00:00');
    }

    const fromStr = fromDate.toISOString().split('T')[0];

    _results = students.filter(s => {
      const mine = records.filter(r =>
        r.type === type &&
        r.studentId === s.id &&
        r.date >= fromStr &&
        (type === 'attendance' || type === 'mass-attendance' ? r.present : true)
      );
      return mine.length === 0;
    });

    _showResults(type, `لم ${_typeLabel(type)} منذ ${fromStr}`);
  };

  const _runCountFilter = (students, records, type) => {
    const op      = Utils.el('filter-count-op')?.value  ?? 'lt';
    const val     = parseInt(Utils.el('filter-count-val')?.value ?? '3', 10);
    const period  = parseInt(Utils.el('filter-count-period')?.value ?? '0', 10);

    let fromStr = '';
    if (period > 0) {
      const d = new Date();
      d.setDate(d.getDate() - period * 7);
      fromStr = d.toISOString().split('T')[0];
    }

    _results = students.filter(s => {
      const mine = records.filter(r =>
        r.type === type &&
        r.studentId === s.id &&
        (type === 'attendance' || type === 'mass-attendance' ? r.present : true) &&
        (!fromStr || r.date >= fromStr)
      );
      const count = mine.length;
      if (op === 'lt') return count < val;
      if (op === 'gt') return count > val;
      return count === val;
    });

    const opLabel = { lt:'أقل من', gt:'أكتر من', eq:'يساوي' }[op];
    _showResults(type, `${_typeLabel(type)} ${opLabel} ${val} مرة`);
  };

  // ── Show results ───────────────────────────
  const _showResults = (type, subtitle) => {
    const el = Utils.el('filter-results');
    if (!el) return;

    if (_results.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🎉</div>
          <p>لا يوجد مخدومين بهذه المعايير</p>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="filter-results-header">
        <div>
          <div class="filter-results-title">${_results.length} مخدوم</div>
          <div class="filter-results-sub">${subtitle}</div>
        </div>
        <button class="filter-export-btn" id="filter-export">
          📥 Excel
        </button>
      </div>
      <div class="m-list">
        ${_results.map(s => {
          const cls = State.getClassById(s.cls);
          return `
          <div class="m-card" data-id="${s.id}" style="cursor:pointer">
            <div class="m-card__top">
              <div class="m-card__avatar">${Utils.initials(s.name)}</div>
              <div class="m-card__info">
                <div class="m-card__name">${s.name.split(' ').slice(0,3).join(' ')}</div>
                <div class="m-card__sub">${cls?.name?.replace('فصل ','') ?? ''}</div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;

    Utils.on('filter-export', 'click', () => _export(type, subtitle));

    el.addEventListener('click', e => {
      const card = e.target.closest('[data-id]');
      if (card && !e.target.closest('#filter-export')) {
        ProfileScreen.open(parseInt(card.dataset.id, 10));
      }
    });
  };

  // ── Export Excel CSV ───────────────────────
  const _export = (type, subtitle) => {
    if (!_results.length) { UI.toast('لا توجد نتائج للتصدير'); return; }

    const records = State.get('records');
    const rows    = [['الاسم','الفصل','المنطقة','تليفون الولد','تليفون الأم',`آخر ${_typeLabel(type)}`,'عدد المرات']];

    _results.forEach(s => {
      const cls   = State.getClassById(s.cls)?.name?.replace('فصل ','') ?? '';
      const mine  = records.filter(r => r.type === type && r.studentId === s.id);
      const last  = [...mine].sort((a,b)=>b.date?.localeCompare(a.date??'')).at(0)?.date ?? '—';
      rows.push([s.name, cls, s.area??'', s.phones?.child??'', s.phones?.mom??'', last, mine.length]);
    });

    const BOM = '\uFEFF';
    const csv = rows.map(r => r.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([BOM + csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `فلتر_${_typeLabel(type)}_${new Date().toLocaleDateString('ar-EG')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    UI.toast(`✅ تم تصدير ${_results.length} مخدوم`);
  };

  const _typeLabel = t => ({ attendance:'مدارس الأحد', 'mass-attendance':'القداس', call:'مكالمة', visit:'افتقاد منزلي' }[t] ?? t);

  Router.onEnter('filter', _onEnter);
  return { init };
})();
