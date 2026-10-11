// ─────────────────────────────────────────────
//  ui/profile.js  —  Student profile screen
// ─────────────────────────────────────────────

const ProfileScreen = (() => {
  let _currentId = null;

  const init = () => {
    Utils.on('profile-back', 'click', () => Router.back());
    State.on('recordsChanged',  _refresh);
    State.on('studentUpdated',  _refresh);
  };

  const open = (id) => {
    _currentId = id;
    Router.go('profile');
  };

  const _onEnter = () => _render();

  const _refresh = () => {
    if (document.getElementById('profile-screen')?.classList.contains('active')) {
      _render();
    }
  };

  // ── Format birthday for display ───────────
  const _formatBirthday = (dateStr) => {
    if (!dateStr) return null;
    // dateStr is 'YYYY-MM-DD'
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d)) return null;
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Is today within ±3 days of the birthday month/day?
  const _isBirthdaySoon = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    const bday  = new Date(dateStr + 'T00:00:00');
    // Compare month + day only (ignore year)
    const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
    const diff = Math.round((thisYear - today) / 86_400_000);
    return diff >= 0 && diff <= 3;
  };

  const _render = () => {
    if (!_currentId) return;
    const s       = State.getStudentById(_currentId);
    const cls     = State.getClassById(s.cls);
    const records = State.getRecordsFor(_currentId);
    const user    = State.get('user');
    const urgent  = s.notes?.startsWith('⚠️');
    const bdSoon  = _isBirthdaySoon(s.birthday);

    Utils.el('profile-title').textContent = s.name.split(' ').slice(0, 2).join(' ');

    // Build phones array with labels for call buttons
    const phones = _buildPhones(s);

    // Birthday formatted
    const bdFormatted = _formatBirthday(s.birthday);

    Utils.html('profile-content', `
      ${urgent ? `<div class="alert-banner">${s.notes}</div>` : ''}
      ${bdSoon  ? `<div class="alert-banner alert-banner--birthday">🎂 عيد ميلاد قريب! ${bdFormatted}</div>` : ''}

      <div class="profile-header">
        <div class="profile-header__avatar" id="profile-avatar" data-initials="${Utils.initials(s.name)}">
          ${Utils.initials(s.name)}
        </div>
        <h2 class="profile-header__name">${s.name}</h2>
        <p class="profile-header__class">${cls?.name ?? ''}
          ${s.deacon        ? ' <span class="badge badge--purple">شماس</span>' : ''}
          ${s.lordsBrethren ? ' <span class="badge badge--green">أخوة الرب</span>' : ''}
        </p>
        ${bdFormatted ? `<p class="profile-header__birthday">🎂 ${bdFormatted}</p>` : ''}
      </div>

      <!-- Stats box -->
      <div class="profile-stats-grid">
        ${(()=>{
          const massRecs  = records.filter(r=>r.type==='mass-attendance'&&r.studentId===s.id&&r.present);
          const attRecs   = records.filter(r=>r.type==='attendance'&&r.studentId===s.id&&r.present);
          const callRecs  = records.filter(r=>r.type==='call'&&r.studentId===s.id);
          const visitRecs = records.filter(r=>r.type==='visit'&&r.studentId===s.id);
          const latest = arr => [...arr].sort((a,b)=>(b.date??'').localeCompare(a.date??'')).at(0)?.date;
          const fmtLast = d => d ? `${Utils.formatDate(d)}<br><span class="ps-card__ago">${Utils.timeAgo(d)}</span>` : '—';
          return [
            {icon:'⛪', count:massRecs.length,  label:'حضور القداس',      last:fmtLast(latest(massRecs))},
            {icon:'📋', count:attRecs.length,   label:'مدارس الأحد',      last:fmtLast(latest(attRecs))},
            {icon:'📞', count:callRecs.length,  label:'افتقاد تليفوني',   last:fmtLast(latest(callRecs))},
            {icon:'🏠', count:visitRecs.length, label:'افتقاد منزلي',     last:fmtLast(latest(visitRecs))},
          ].map(c=>`
            <div class="ps-card">
              <div class="ps-card__icon">${c.icon}</div>
              <div class="ps-card__count">${c.count}</div>
              <div class="ps-card__label">${c.label}</div>
              <div class="ps-card__last">${c.last}</div>
            </div>`).join('');
        })()}
      </div>

      <div class="action-row ${user?.role === 'admin' ? 'action-row--5' : 'action-row--4'}">
        <button class="action-btn action-btn--att"   id="p-att-btn"> <span>📋</span> حضور   </button>
        <button class="action-btn action-btn--call"  id="p-call-btn"><span>📞</span> مكالمة </button>
        <button class="action-btn action-btn--visit" id="p-vis-btn"> <span>🏠</span> افتقاد </button>
        <button class="action-btn action-btn--edit"  id="p-edit-btn"><span>✏️</span> تعديل  </button>
        ${user?.role === 'admin' ? `
        <button class="action-btn action-btn--transfer" id="p-transfer-btn"><span>🔀</span> نقل</button>` : ''}
      </div>

      <!-- ① الاتصال السريع -->
      <div class="info-card">
        <h3 class="info-card__title collapsible__header" data-target="sec-phones">📱 الاتصال السريع <span class="collapsible__icon">▲</span></h3>
        <div id="sec-phones">
        ${phones.length === 0
          ? '<p style="font-size:13px;color:var(--text-2)">لا توجد أرقام</p>'
          : phones.map(p => `
            <a href="tel:${p.number}" class="call-btn">
              <span class="call-btn__label">${p.label}</span>
              <span class="call-btn__number">${p.number}</span>
              <span class="call-btn__icon">📞</span>
            </a>`).join('')}
      </div></div>

      <!-- ② بيانات التواصل -->
      <div class="info-card">
        <h3 class="info-card__title collapsible__header" data-target="sec-contact">📍 بيانات التواصل <span class="collapsible__icon">▲</span></h3>
        <div id="sec-contact">
        <dl class="info-list">
          ${s.address ? `
          <div class="info-list__row">
            <dt>العنوان</dt><dd>${s.address}</dd>
          </div>` : ''}
          ${(s.area && s.area.trim()) ? `
          <div class="info-list__row">
            <dt>المنطقة</dt><dd>${s.area}</dd>
          </div>` : ''}
          ${s.school ? `
          <div class="info-list__row">
            <dt>المدرسة</dt><dd>${s.school}</dd>
          </div>` : ''}
          ${bdFormatted ? `
          <div class="info-list__row">
            <dt>تاريخ الميلاد</dt><dd>${bdFormatted}</dd>
          </div>` : ''}
        </dl>
      </div></div>

      <!-- ③ بيانات الأسرة -->
      <div class="info-card">
        <h3 class="info-card__title collapsible__header" data-target="sec-family">👨‍👩‍👦 بيانات الأسرة <span class="collapsible__icon">▲</span></h3>
        <div id="sec-family">
        <dl class="info-list">
          ${s.jobDad ? `
          <div class="info-list__row">
            <dt>وظيفة الأب</dt><dd>${s.jobDad}</dd>
          </div>` : ''}
          ${s.jobMom ? `
          <div class="info-list__row">
            <dt>وظيفة الأم</dt><dd>${s.jobMom}</dd>
          </div>` : ''}
          ${s.confessor ? `
          <div class="info-list__row">
            <dt>أب الاعتراف</dt><dd>${s.confessor}</dd>
          </div>` : ''}
          <div class="info-list__row">
            <dt>الشمامسة</dt>
            <dd>${s.deacon ? '<span class="badge badge--purple">شماس ✓</span>' : 'لا'}</dd>
          </div>
          <div class="info-list__row">
            <dt>أخوة الرب</dt>
            <dd>${s.lordsBrethren ? '<span class="badge badge--green">أخوة الرب ✓</span>' : 'لا'}</dd>
          </div>
        </dl>
      </div></div>

      <!-- ③.٥ آخر تحديث -->
      ${(() => {
        const edits = records
          .filter(r => r.type === 'student-edit' && r.studentId === s.id)
          .sort((a, b) => (b.createdAt ?? b.date ?? '').localeCompare(a.createdAt ?? a.date ?? ''));
        if (!edits.length) return '';
        const last = edits[0];
        const dateLabel = last.createdAt
          ? new Date(last.createdAt).toLocaleDateString('ar-EG', { day:'numeric', month:'long', year:'numeric' })
          : Utils.formatDate(last.date ?? '');
        return `
        <div class="last-update-card">
          <span class="last-update-card__icon">🕐</span>
          <div class="last-update-card__info">
            <span class="last-update-card__label">آخر تحديث للملف</span>
            <span class="last-update-card__date">${dateLabel}</span>
          </div>
          <span class="last-update-card__by">${last.by ?? '—'}</span>
        </div>`;
      })()}

      <!-- ④ ملاحظات — always shown if exists, even if not urgent -->
      ${s.notes ? `
      <div class="info-card">
        <h3 class="info-card__title">📝 ملاحظات</h3>
        <p class="info-card__notes">${s.notes}</p>
      </div>` : ''}

      <!-- ⑤ سجل المتابعة -->
      <div class="info-card">
        <h3 class="info-card__title collapsible__header" data-target="sec-history">📊 سجل المتابعة <span class="collapsible__icon">▲</span></h3>
        <div id="sec-history">
        ${records.length === 0
          ? '<div class="empty-state"><div class="empty-state__icon">📭</div><p>لا يوجد سجل بعد</p></div>'
          : records.slice(0, 20).map(_historyRow).join('')}
        </div>
      </div>
    `);

    // Load photo AFTER DOM is rendered (profile-avatar element now exists)
    _loadPhoto(s.id);

    Utils.on('p-att-btn',      'click', () => Router.go('attendance'));

    // Collapse/expand toggle
    Utils.el('profile-content')?.addEventListener('click', e => {
      const header = e.target.closest('.collapsible__header');
      if (!header) return;
      const targetId = header.dataset.target;
      const body     = Utils.el(targetId);
      const icon     = header.querySelector('.collapsible__icon');
      if (!body) return;
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : '';
      if (icon) icon.textContent = isOpen ? '▼' : '▲';
    });

    // Delete record (admin only)
    Utils.el('profile-content')?.addEventListener('click', async e => {
      const btn = e.target.closest('.history-delete-btn');
      if (!btn) return;
      const recordId = btn.dataset.recordId;
      if (!recordId) return;
      try {
        await firebase.firestore().collection('records').doc(recordId).delete();
        // Remove from local state
        const updated = State.get('records').filter(r => r.id !== recordId);
        State.setRecords(updated);
        UI.toast('✅ تم حذف السجل');
      } catch(e) {
        UI.toast('❌ فشل الحذف: ' + e.message);
      }
    });
    Utils.on('p-edit-btn',     'click', () => EditStudentScreen.open(_currentId));
    Utils.on('p-call-btn',     'click', () => _logCall());
    Utils.on('p-vis-btn',      'click', () => _logWithNote('visit'));
    Utils.on('p-transfer-btn', 'click', () => _showTransferModal());
  };

  // Build phones list with labels, filtering empty
  const _buildPhones = (s) => {
    const phones = s.phones ?? {};
    const list = [];
    // Support both old format (array) and new format (object)
    if (Array.isArray(phones)) {
      const labels = ['الولد', 'الأم', 'الأب', 'إضافي'];
      phones.forEach((num, i) => {
        if (num) list.push({ label: labels[i] ?? 'رقم', number: num });
      });
    } else {
      if (phones.child) list.push({ label: 'الولد', number: phones.child });
      if (phones.mom)   list.push({ label: 'الأم',  number: phones.mom });
      if (phones.dad)   list.push({ label: 'الأب',  number: phones.dad });
    }
    return list;
  };

  const _historyRow = (r) => {
    const isAdmin = State.get('user')?.role === 'admin';
    return `
    <div class="history-row" data-record-id="${r.fsId ?? ''}">
      <span class="history-row__date">${Utils.formatDate(r.date)}</span>
      <div class="history-row__body">
        ${UI.recordBadge(r)}
        ${r.note ? `<p class="history-row__note">${r.note}</p>` : ''}
        <p class="history-row__by">بواسطة: ${r.by ?? '—'}</p>
      </div>
      ${isAdmin && r.fsId ? `
        <button class="history-delete-btn" data-record-id="${r.fsId}" title="حذف">🗑️</button>
      ` : ''}
    </div>`;
  };

  // Call = phone followup → always prompt for note
  const _logCall = async () => {
    const s    = State.getStudentById(_currentId);
    const note = await UI.modal.open({
      title:       `افتقاد هاتفي: ${s.name.split(' ').slice(0, 2).join(' ')}`,
      placeholder: 'كيف الحال؟ هل حضر؟ أي ملاحظات...',
    });
    if (note === null) return; // cancelled
    await DB.write({ type: 'call', studentId: _currentId, date: Utils.today(), note });
    UI.toast(`✅ تم تسجيل المكالمة لـ ${s.name.split(' ')[0]}`);
  };

  const _logWithNote = async (type) => {
    const s    = State.getStudentById(_currentId);
    const note = await UI.modal.open({
      title:       `افتقاد بيتي: ${s.name.split(' ').slice(0, 2).join(' ')}`,
      placeholder: 'اكتب ملاحظات الزيارة...',
    });
    if (note === null) return;
    await DB.write({ type, studentId: _currentId, date: Utils.today(), note });
    UI.toast(`✅ تم تسجيل الافتقاد لـ ${s.name.split(' ')[0]}`);
  };

  // ── Load student photo ───────────────────
  const _loadPhoto = async (studentId) => {
    const avatar = Utils.el('profile-avatar');
    if (!avatar) return;

    // 1. Session cache (instant — set right after upload)
    const cached = localStorage.getItem('photo_' + studentId);
    if (cached) { _applyPhoto(avatar, cached); return; }

    // 2. Firestore — persistent across sessions/devices
    try {
      const doc = await firebase.firestore()
        .collection('student_photos').doc(String(studentId)).get();
      if (doc.exists) {
        const url = doc.data().url;
        localStorage.setItem('photo_' + studentId, url);
        // Re-get avatar since render may have refreshed the DOM
        const av = Utils.el('profile-avatar');
        if (av) _applyPhoto(av, url);
      }
    } catch(e) {
      // No photo — keep initials, fail silently
    }
  };

  const _applyPhoto = (avatar, url) => {
    avatar.innerHTML = `<img src="${url}" class="profile-avatar__img" alt="صورة المخدوم"
      onerror="this.parentElement.innerHTML=this.parentElement.dataset.initials">`;
    avatar.classList.add('profile-header__avatar--photo');
  };
  // ─────────────────────────────────────────

  // ── Transfer student to another class ───────
  const _showTransferModal = async () => {
    const s      = State.getStudentById(_currentId);
    const curCls = State.getClassById(s.cls);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3 class="modal__title">🔀 نقل ${s.name.split(' ')[0]} لفصل تاني</h3>
        <p style="font-size:13px;color:var(--text-2);margin-bottom:12px">
          الفصل الحالي: <b>${curCls?.name ?? s.cls}</b>
        </p>
        <div class="form-group">
          <label>الفصل الجديد</label>
          <select id="transfer-cls-sel" class="class-switcher-sel">
            ${CONFIG.classes
              .filter(c => c.id !== s.cls)
              .map(c => `<option value="${c.id}">${c.name}</option>`)
              .join('')}
          </select>
        </div>
        <p id="transfer-err" style="color:var(--red);font-size:13px;min-height:16px"></p>
        <div class="modal__btns">
          <button class="btn btn--gray"    id="transfer-cancel">إلغاء</button>
          <button class="btn btn--primary" id="transfer-confirm">نقل ✓</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
    Utils.on('transfer-cancel', 'click', () => overlay.remove());

    Utils.on('transfer-confirm', 'click', async () => {
      const toClsId  = Utils.el('transfer-cls-sel')?.value;
      const toCls    = CONFIG.classes.find(c => c.id === toClsId);
      const fromCls  = curCls;
      const errEl    = Utils.el('transfer-err');
      const btn      = Utils.el('transfer-confirm');

      if (!toClsId) return;

      btn.disabled    = true;
      btn.textContent = 'جارٍ النقل…';

      try {
        const res  = await fetch(CONFIG.sheets.scriptUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body:    JSON.stringify({
            action:      'transferStudent',
            studentName: s.name,
            fromClass:   fromCls?.name ?? s.cls.replace(/_/g,' '),
            toClass:     toCls?.name   ?? toClsId.replace(/_/g,' '),
          }),
        });
        const data = await res.json();

        if (data.status === 'transferred') {
          overlay.remove();
          UI.toast(`✅ تم نقل ${s.name.split(' ')[0]} إلى ${toCls?.name}`);
          // Reload students to reflect change
          await Sheets.loadStudents();
          Router.go('home');
        } else {
          if(errEl) errEl.textContent = '❌ ' + (data.error ?? 'خطأ');
          btn.disabled    = false;
          btn.textContent = 'نقل ✓';
        }
      } catch(e) {
        if(errEl) errEl.textContent = '❌ فشل الاتصال';
        btn.disabled    = false;
        btn.textContent = 'نقل ✓';
      }
    });
  };
  // ─────────────────────────────────────────────

  Router.onEnter('profile', _onEnter);

  return { init, open };
})();
