// ─────────────────────────────────────────────
//  ui/students.js  —  Student list screen
// ─────────────────────────────────────────────

const StudentsScreen = (() => {
  let _filtered = [];

  const TITLES = {
    call:    'تسجيل مكالمة',
    visit:   'تسجيل افتقاد',
    profile: 'ملفات الأولاد',
  };

  const init = () => {
    Utils.on('students-back',   'click', () => Router.back());
    Utils.el('student-list')?.addEventListener('click', _onClick);
    Utils.on('student-search',  'input', _onSearch);
    State.on('recordsChanged',  _render);
  };

  const _onEnter = (mode) => {
    Utils.el('students-title').textContent = TITLES[mode] ?? 'الأولاد';
    Utils.el('student-search').value = '';
    _filtered = State.getMyStudents();
    _render();
  };

  const _onSearch = () => {
    const q = Utils.el('student-search').value.trim();
    _filtered = q
      ? State.getMyStudents().filter(s => s.name.includes(q))
      : State.getMyStudents();
    _render();
  };

  const _render = () => {
    const container = Utils.el('student-list');
    if (!_filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">🔍</div>
          <p>لا توجد نتائج</p>
        </div>`;
      return;
    }

    container.innerHTML = _filtered.map(_studentCard).join('');
  };

  const _studentCard = (s) => `
    <div class="student-card" data-id="${s.id}">
      <div class="student-card__avatar">${Utils.initials(s.name)}</div>
      <div class="student-card__info">
        <div class="student-card__name">${s.name}</div>
        <div class="student-card__meta">${Utils.truncate(s.address, 48)}</div>
      </div>
      ${UI.statusDots(s.id)}
    </div>`;

  const _onClick = async (e) => {
    const card = e.target.closest('.student-card');
    if (!card) return;
    const id   = parseInt(card.dataset.id, 10);
    const mode = Router.getMode();

    if (mode === 'call') {
      await _quickLog('call', id);
      return;
    }
    if (mode === 'visit') {
      await _logWithNote('visit', id);
      return;
    }
    ProfileScreen.open(id);
  };

  const _quickLog = async (type, id) => {
    const s = State.getStudentById(id);
    await DB.write({ type, studentId: id, date: Utils.today(), note: '' });
    UI.toast(`تم تسجيل ${type === 'call' ? 'المكالمة' : 'الافتقاد'} لـ ${s.name.split(' ')[0]}`);
    _render();
  };

  const _logWithNote = async (type, id) => {
    const s    = State.getStudentById(id);
    const note = await UI.modal.open({
      title:       `افتقاد: ${s.name.split(' ').slice(0, 2).join(' ')}`,
      placeholder: 'اكتب ملاحظات الزيارة...',
    });
    if (note === null) return; // cancelled
    await DB.write({ type, studentId: id, date: Utils.today(), note });
    UI.toast(`تم تسجيل الافتقاد لـ ${s.name.split(' ')[0]}`);
    _render();
  };

  Router.onEnter('students', _onEnter);

  return { init };
})();
