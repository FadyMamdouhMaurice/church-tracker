// ─────────────────────────────────────────────
//  ui/edit-student.js
//  Edit all student fields — saved to Firebase
//  + synced back to Google Sheets
// ─────────────────────────────────────────────

const EditStudentScreen = (() => {
  let _studentId = null;

  const init = () => {
    Utils.on('edit-back',     'click', () => Router.back());
    Utils.on('edit-save-btn', 'click', _save);
  };

  // Called from profile screen
  const open = (id) => {
    _studentId = id;
    Router.go('edit');
  };

  const _onEnter = () => _render();

  const _render = () => {
    const s = State.getStudentById(_studentId);
    if (!s) return;

    Utils.el('edit-title').textContent = s.name.split(' ').slice(0, 2).join(' ');

    // phones — support both object and array format
    const phones = _getPhones(s);

    Utils.html('edit-form', `
      <div class="edit-section">
        <div class="edit-section__title">👦 بيانات الولد</div>

        ${_field('name',    'الاسم الكامل',   s.name,    'text')}
        ${_field('address', 'العنوان',         s.address, 'textarea')}
        ${_field('school',  'المدرسة',         s.school,  'text')}
        <div class="form-group">
          <label>الشمامسة</label>
          <div class="toggle-row">
            <label class="toggle-label">
              <input type="checkbox" id="field-deacon" ${s.deacon ? 'checked' : ''}>
              <span class="toggle-track"><span class="toggle-thumb"></span></span>
              <span>${s.deacon ? 'شماس ✓' : 'ليس شماساً'}</span>
            </label>
          </div>
        </div>
      </div>

      <div class="edit-section">
        <div class="edit-section__title">📱 أرقام التواصل</div>
        ${_field('phone-child', 'رقم الولد',  phones.child, 'tel')}
        ${_field('phone-mom',   'رقم الأم',   phones.mom,   'tel')}
        ${_field('phone-dad',   'رقم الأب',   phones.dad,   'tel')}
      </div>

      <div class="edit-section">
        <div class="edit-section__title">👨‍👩‍👦 بيانات الأسرة</div>
        ${_field('job-dad',    'وظيفة الأب',    s.jobDad,    'text')}
        ${_field('job-mom',    'وظيفة الأم',    s.jobMom,    'text')}
        ${_field('confessor',  'أب الاعتراف',   s.confessor, 'text')}
      </div>

      <div class="edit-section">
        <div class="edit-section__title">📝 ملاحظات</div>
        ${_field('notes', 'ملاحظات', s.notes, 'textarea')}
      </div>

      <div class="edit-last-modified" id="edit-last-modified"></div>
    `);

    // Show last edit info if exists
    _showLastEdit(s);

    // Toggle label for deacon checkbox
    Utils.el('field-deacon')?.addEventListener('change', function() {
      this.nextElementSibling.nextElementSibling.textContent =
        this.checked ? 'شماس ✓' : 'ليس شماساً';
    });
  };

  const _field = (id, label, value, type) => {
    const val = value ?? '';
    if (type === 'textarea') {
      return `<div class="form-group">
        <label>${label}</label>
        <textarea id="field-${id}" class="edit-textarea" rows="3">${val}</textarea>
      </div>`;
    }
    return `<div class="form-group">
      <label>${label}</label>
      <input id="field-${id}" type="${type}" value="${val.replace(/"/g, '&quot;')}" autocomplete="off">
    </div>`;
  };

  const _getPhones = (s) => {
    if (s.phones && !Array.isArray(s.phones)) return s.phones;
    if (Array.isArray(s.phones)) {
      return { child: s.phones[0]??'', mom: s.phones[1]??'', dad: s.phones[2]??'' };
    }
    return { child: '', mom: '', dad: '' };
  };

  const _showLastEdit = (s) => {
    // Check Firebase for last edit record
    const edits = State.get('records')
      .filter(r => r.type === 'student-edit' && r.studentId === s.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    const el = Utils.el('edit-last-modified');
    if (el && edits.length > 0) {
      const last = edits[0];
      el.textContent = `آخر تعديل: ${Utils.formatDate(last.date)} بواسطة ${last.by}`;
    }
  };

  const _save = async () => {
    const s = State.getStudentById(_studentId);
    if (!s) return;

    const btn = Utils.el('edit-save-btn');
    btn.disabled    = true;
    btn.textContent = '...';

    // Collect all field values
    const updated = {
      ...s,
      name:      _val('name'),
      address:   _val('address'),
      school:    _val('school'),
      deacon:    Utils.el('field-deacon')?.checked ?? s.deacon,
      phones: {
        child: _val('phone-child'),
        mom:   _val('phone-mom'),
        dad:   _val('phone-dad'),
      },
      jobDad:    _val('job-dad'),
      jobMom:    _val('job-mom'),
      confessor: _val('confessor'),
      notes:     _val('notes'),
      _editedBy:   State.get('user').displayName,
      _editedAt:   new Date().toISOString(),
    };

    // 1. Update local State immediately
    State.updateStudent(updated);

    // 2. Save edit record to Firebase (audit trail)
    await DB.write({
      type:      'student-edit',
      studentId: s.id,
      date:      Utils.today(),
      note:      `تعديل بيانات: ${updated.name}`,
    });

    // 3. Sync to Google Sheets
    Sheets.syncStudentEdit(updated);

    btn.disabled    = false;
    btn.textContent = 'حفظ ✓';
    UI.toast(`✅ تم حفظ بيانات ${updated.name.split(' ')[0]}`);
    Router.back();
  };

  const _val = (id) => {
    const el = Utils.el(`field-${id}`);
    return el ? el.value.trim() : '';
  };

  Router.onEnter('edit', _onEnter);

  return { init, open };
})();
