// ─────────────────────────────────────────────
//  ui/profile.js  —  Student profile screen
// ─────────────────────────────────────────────

const ProfileScreen = (() => {
  let _currentId = null;

  const init = () => {
    Utils.on('profile-back', 'click', () => Router.back());
    State.on('recordsChanged', _refresh);
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

    Utils.html('profile-content', `
      ${urgent ? `<div class="alert-banner">${s.notes}</div>` : ''}

      <div class="profile-header">
        <div class="profile-header__avatar">${Utils.initials(s.name)}</div>
        <h2 class="profile-header__name">${s.name}</h2>
        <p class="profile-header__class">${cls?.name ?? ''}</p>
      </div>

      <div class="action-row">
        <button class="action-btn action-btn--att"   id="p-att-btn"> <span>📋</span> حضور   </button>
        <button class="action-btn action-btn--call"  id="p-call-btn"><span>📞</span> مكالمة </button>
        <button class="action-btn action-btn--visit" id="p-vis-btn"> <span>🏠</span> افتقاد </button>
      </div>

      <div class="info-card">
        <h3 class="info-card__title">📍 بيانات التواصل</h3>
        <dl class="info-list">
          <div class="info-list__row">
            <dt>العنوان</dt>
            <dd>${s.address || '—'}</dd>
          </div>
          ${s.phones.map((p, i) => `
          <div class="info-list__row">
            <dt>${['الولد','الأم','الأب','إضافي'][i] ?? 'رقم'}</dt>
            <dd><a href="tel:${p}" class="phone-link">📱 ${p}</a></dd>
          </div>`).join('')}
          ${s.school ? `
          <div class="info-list__row">
            <dt>المدرسة</dt>
            <dd>${s.school}</dd>
          </div>` : ''}
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

    // Wire action buttons after render
    Utils.on('p-att-btn',  'click', () => Router.go('attendance'));
    Utils.on('p-call-btn', 'click', () => _quickLog('call'));
    Utils.on('p-vis-btn',  'click', () => _logWithNote('visit'));
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

  const _quickLog = async (type) => {
    const s = State.getStudentById(_currentId);
    await DB.write({ type, studentId: _currentId, date: Utils.today(), note: '' });
    UI.toast(`تم تسجيل المكالمة لـ ${s.name.split(' ')[0]}`);
  };

  const _logWithNote = async (type) => {
    const s    = State.getStudentById(_currentId);
    const note = await UI.modal.open({
      title:       `افتقاد: ${s.name.split(' ').slice(0, 2).join(' ')}`,
      placeholder: 'اكتب ملاحظات الزيارة...',
    });
    if (note === null) return;
    await DB.write({ type, studentId: _currentId, date: Utils.today(), note });
    UI.toast(`تم تسجيل الافتقاد لـ ${s.name.split(' ')[0]}`);
  };

  Router.onEnter('profile', _onEnter);

  return { init, open };
})();
