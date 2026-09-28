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

  const _render = () => {
    if (!_currentId) return;
    const s       = State.getStudentById(_currentId);
    const cls     = State.getClassById(s.cls);
    const records = State.getRecordsFor(_currentId);
    const urgent  = s.notes?.startsWith('⚠️');

    Utils.el('profile-title').textContent = s.name.split(' ').slice(0, 2).join(' ');

    // Build phones array with labels for call buttons
    const phones = _buildPhones(s);

    Utils.html('profile-content', `
      ${urgent ? `<div class="alert-banner">${s.notes}</div>` : ''}

      <div class="profile-header">
        <div class="profile-header__avatar">${Utils.initials(s.name)}</div>
        <h2 class="profile-header__name">${s.name}</h2>
        <p class="profile-header__class">${cls?.name ?? ''}
          ${s.deacon ? ' <span class="badge badge--purple">شماس</span>' : ''}
        </p>
      </div>

      <div class="action-row action-row--4">
        <button class="action-btn action-btn--att"   id="p-att-btn"> <span>📋</span> حضور   </button>
        <button class="action-btn action-btn--call"  id="p-call-btn"><span>📞</span> مكالمة </button>
        <button class="action-btn action-btn--visit" id="p-vis-btn"> <span>🏠</span> افتقاد </button>
        <button class="action-btn action-btn--edit"  id="p-edit-btn"><span>✏️</span> تعديل  </button>
      </div>

      <div class="info-card">
        <h3 class="info-card__title">📱 الاتصال السريع</h3>
        ${phones.length === 0
          ? '<p style="font-size:13px;color:var(--text-2)">لا توجد أرقام</p>'
          : phones.map(p => `
            <a href="tel:${p.number}" class="call-btn">
              <span class="call-btn__label">${p.label}</span>
              <span class="call-btn__number">${p.number}</span>
              <span class="call-btn__icon">📞</span>
            </a>`).join('')}
      </div>

      <div class="info-card">
        <h3 class="info-card__title">📍 بيانات التواصل</h3>
        <dl class="info-list">
          ${s.address ? `
          <div class="info-list__row">
            <dt>العنوان</dt><dd>${s.address}</dd>
          </div>` : ''}
          ${s.school ? `
          <div class="info-list__row">
            <dt>المدرسة</dt><dd>${s.school}</dd>
          </div>` : ''}
        </dl>
      </div>

      <div class="info-card">
        <h3 class="info-card__title">👨‍👩‍👦 بيانات الأسرة</h3>
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
        </dl>
      </div>

      ${s.notes && !urgent ? `
      <div class="info-card">
        <h3 class="info-card__title">📝 ملاحظات</h3>
        <p class="info-card__notes">${s.notes}</p>
      </div>` : ''}

      <div class="info-card">
        <h3 class="info-card__title">📊 سجل المتابعة</h3>
        ${records.length === 0
          ? '<div class="empty-state"><div class="empty-state__icon">📭</div><p>لا يوجد سجل بعد</p></div>'
          : records.slice(0, 20).map(_historyRow).join('')}
      </div>
    `);

    Utils.on('p-att-btn',  'click', () => Router.go('attendance'));
    Utils.on('p-edit-btn', 'click', () => EditStudentScreen.open(_currentId));
    Utils.on('p-call-btn', 'click', () => _logCall());
    Utils.on('p-vis-btn',  'click', () => _logWithNote('visit'));
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

  const _historyRow = (r) => `
    <div class="history-row">
      <span class="history-row__date">${Utils.formatDate(r.date)}</span>
      <div class="history-row__body">
        ${UI.recordBadge(r)}
        ${r.note ? `<p class="history-row__note">${r.note}</p>` : ''}
        <p class="history-row__by">بواسطة: ${r.by ?? '—'}</p>
      </div>
    </div>`;

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

  Router.onEnter('profile', _onEnter);

  return { init, open };
})();
