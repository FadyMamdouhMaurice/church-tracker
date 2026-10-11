// ─────────────────────────────────────────────
//  ui/leaderboard.js  —  Points leaderboard screen
//  Tab 1: فصلك (own class top 10)
//  Tab 2: الدفعة كلها (all classes top 10)
//  Mode toggle: شهري / إجمالي
// ─────────────────────────────────────────────

const LeaderboardScreen = (() => {
  let _tab    = 'class';   // 'class' | 'all'
  let _mode   = 'monthly'; // 'monthly' | 'total'
  let _adj    = [];

  const init = () => {
    Utils.on('lb-back', 'click', () => Router.back());
  };

  const _onEnter = async () => {
    _adj = await Points.loadAdjustments();
    _render();
  };

  const _render = () => {
    const user     = State.get('user');
    const isAdmin  = user?.role === 'admin';
    const records  = State.get('records');
    const students = State.get('students');

    // Build leaderboards
    const myStudents  = students.filter(s => s.cls === user?.classId);
    const classLb     = Points.leaderboard(myStudents,  records, _adj, _mode, 10);
    const allLb       = Points.leaderboard(students,    records, _adj, _mode, 10);
    const currentLb   = _tab === 'class' ? classLb : allLb;

    Utils.html('lb-content', `
      <!-- Mode toggle -->
      <div class="lb-mode-toggle">
        <button class="lb-mode-btn ${_mode==='monthly'?'active':''}" id="lb-mode-monthly">📅 هذا الشهر</button>
        <button class="lb-mode-btn ${_mode==='total'  ?'active':''}" id="lb-mode-total">🏆 إجمالي</button>
      </div>

      <!-- Tabs -->
      <div class="tab-bar" style="margin-bottom:12px">
        <button class="tab ${_tab==='class'?'active':''}" id="lb-tab-class">
          🏫 ${State.getClassById(user?.classId)?.name?.replace('فصل','').trim() ?? 'فصلك'}
        </button>
        <button class="tab ${_tab==='all'?'active':''}" id="lb-tab-all">
          🌟 الدفعة كلها
        </button>
      </div>

      <!-- Top 3 podium -->
      ${currentLb.length >= 3 ? `
      <div class="lb-podium">
        ${_podiumCard(currentLb[1], 1)}
        ${_podiumCard(currentLb[0], 0)}
        ${_podiumCard(currentLb[2], 2)}
      </div>` : ''}

      <!-- Full list -->
      <div class="lb-list">
        ${currentLb.length === 0
          ? '<div class="empty-state"><div class="empty-state__icon">🏆</div><p>لا توجد نقاط بعد</p></div>'
          : currentLb.map((s, i) => _rowCard(s, i, isAdmin)).join('')}
      </div>
    `);

    Utils.on('lb-mode-monthly', 'click', () => { _mode = 'monthly'; _render(); });
    Utils.on('lb-mode-total',   'click', () => { _mode = 'total';   _render(); });
    Utils.on('lb-tab-class',    'click', () => { _tab  = 'class';   _render(); });
    Utils.on('lb-tab-all',      'click', () => { _tab  = 'all';     _render(); });

    // Profile open + admin adjust
    Utils.el('lb-list')?.addEventListener('click', async e => {
      const adjustBtn = e.target.closest('.lb-adjust-btn');
      if (adjustBtn) { await _showAdjustModal(parseInt(adjustBtn.dataset.id, 10)); return; }
      const card = e.target.closest('[data-id]');
      if (card) ProfileScreen.open(parseInt(card.dataset.id, 10));
    });
  };

  const _podiumCard = (s, rank) => {
    if (!s) return '<div class="lb-podium__slot"></div>';
    const heights = ['160px','140px','120px'];
    return `
      <div class="lb-podium__slot" style="height:${heights[rank]}">
        <div class="lb-podium__medal">${Points.medal(rank)}</div>
        <div class="lb-podium__avatar">${Utils.initials(s.name)}</div>
        <div class="lb-podium__name">${s.name.split(' ')[0]}</div>
        <div class="lb-podium__pts">${s[_mode]} نقطة</div>
      </div>`;
  };

  const _rowCard = (s, i, isAdmin) => {
    const cls = State.getClassById(s.cls)?.name?.replace('فصل ','') ?? '';
    return `
      <div class="lb-row" data-id="${s.id}">
        <div class="lb-row__rank">${Points.medal(i)}</div>
        <div class="lb-row__avatar">${Utils.initials(s.name)}</div>
        <div class="lb-row__info">
          <div class="lb-row__name">${s.name.split(' ').slice(0,3).join(' ')}</div>
          <div class="lb-row__cls">${cls}</div>
        </div>
        <div class="lb-row__right">
          <div class="lb-row__pts">${s[_mode]}<span> نقطة</span></div>
          <div class="lb-row__sub">شهري: ${s.monthly} | إجمالي: ${s.total}</div>
        </div>
        ${isAdmin ? `<button class="lb-adjust-btn" data-id="${s.id}" title="تعديل النقاط">⚙️</button>` : ''}
      </div>`;
  };

  // Admin: manual point adjustment modal
  const _showAdjustModal = async (studentId) => {
    const s       = State.getStudentById(studentId);
    const calc    = Points.calcStudent(studentId, State.get('records'), _adj);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3 class="modal__title">⚙️ تعديل نقاط — ${s?.name?.split(' ')[0]}</h3>
        <div class="lb-calc-preview">
          <div>📋 مدارس: <b>${calc.breakdown.filter(w=>w.hasAtt).length}</b></div>
          <div>⛪ قداس: <b>${calc.breakdown.filter(w=>w.hasMass).length}</b></div>
          <div>⭐ بونص: <b>${calc.breakdown.filter(w=>w.bonus).length}</b></div>
          <div>📝 تعديلات: <b>${calc.adjustments.reduce((s,a)=>s+a.points,0)}</b></div>
          <div style="font-weight:800;color:var(--blue)">🏆 الإجمالي: ${calc.total}</div>
        </div>
        <div class="form-group" style="margin-top:12px">
          <label>تعديل يدوي (+ أو -)</label>
          <input id="adj-pts" type="number" value="0" min="-99" max="99"
            style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:16px;font-family:inherit;outline:none">
        </div>
        <div class="form-group">
          <label>سبب التعديل</label>
          <input id="adj-note" type="text" placeholder="مثال: جائزة حضور منتظم"
            style="width:100%;padding:10px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;outline:none">
        </div>
        <div class="modal__btns">
          <button class="btn btn--gray" id="adj-cancel">إلغاء</button>
          <button class="btn btn--primary" id="adj-save">حفظ</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
    Utils.on('adj-cancel', 'click', () => overlay.remove());
    Utils.on('adj-save', 'click', async () => {
      const pts  = parseInt(Utils.el('adj-pts')?.value ?? '0', 10);
      const note = Utils.el('adj-note')?.value?.trim();
      if (pts === 0) { overlay.remove(); return; }
      await Points.saveAdjustment(studentId, pts, note, State.get('user')?.displayName);
      _adj = await Points.loadAdjustments();
      overlay.remove();
      UI.toast(`✅ تم إضافة ${pts > 0 ? '+' : ''}${pts} نقطة`);
      _render();
    });
  };

  Router.onEnter('leaderboard', _onEnter);
  return { init };
})();
