// ─────────────────────────────────────────────
//  ui/edit-student.js
//  Edit all student fields — saved to Firebase
//  + synced back to Google Sheets
// ─────────────────────────────────────────────

const EditStudentScreen = (() => {
  let _studentId  = null;
  let _photoFile  = null;   // selected File object
  let _photoUrl   = null;   // current photo URL from Drive

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

    // Load current photo first
    _loadCurrentPhoto(s.id);

    Utils.html('edit-form', `
      <!-- ① Photo section -->
      <div class="edit-section photo-upload-section">
        <div class="edit-section__title">📷 صورة المخدوم</div>
        <div class="photo-upload-area" id="photo-upload-area">
          <div class="photo-upload-preview" id="photo-preview">
            <div class="photo-upload-initials" id="photo-initials">${Utils.initials(s.name)}</div>
          </div>
          <div class="photo-upload-btns">
            <label class="photo-upload-btn photo-upload-btn--camera" for="photo-input-camera">
              📷 كاميرا
            </label>
            <label class="photo-upload-btn photo-upload-btn--gallery" for="photo-input-gallery">
              🖼️ معرض
            </label>
          </div>
          <input id="photo-input-camera"  type="file" accept="image/*" capture="environment" style="display:none">
          <input id="photo-input-gallery" type="file" accept="image/*" style="display:none">
          <p id="photo-status" class="photo-upload-status"></p>
        </div>
      </div>

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

    // Wire photo inputs
    Utils.el('photo-input-camera')?.addEventListener('change',  e => _onPhotoSelected(e));
    Utils.el('photo-input-gallery')?.addEventListener('change', e => _onPhotoSelected(e));

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

    // 3. Upload photo if selected
    if (_photoFile) {
      await _uploadPhoto(s.id);
    }

    // 4. Sync to Google Sheets
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

  // ── Photo helpers ─────────────────────────
  const _loadCurrentPhoto = (studentId) => {
    // Only show photo if already cached from a previous upload this session
    const cached = sessionStorage.getItem('photo_' + studentId);
    if (cached) { _showPreview(cached); }
    // No network call — avoids 404 for students without photos
  };

  const _onPhotoSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { UI.toast('الصورة أكبر من 5MB — اختار صورة أصغر'); return; }
    _photoFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => _showPreview(ev.target.result);
    reader.readAsDataURL(file);
    Utils.el('photo-status').textContent = '📷 صورة جديدة — ستُرفع عند الحفظ';
  };

  const _showPreview = (src) => {
    const preview = Utils.el('photo-preview');
    if (!preview) return;
    preview.innerHTML = `<img src="${src}" class="photo-preview__img"
      onerror="this.parentElement.innerHTML='<div class=\"photo-upload-initials\">?</div>'">`;
  };

  const _uploadPhoto = async (studentId) => {
    if (!_photoFile) return;
    const status = Utils.el('photo-status');
    if (status) status.textContent = '⏫ جارٍ رفع الصورة...';

    try {
      // Convert file to base64
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload  = (e) => res(e.target.result.split(',')[1]);
        reader.onerror = rej;
        reader.readAsDataURL(_photoFile);
      });

      const response = await fetch(CONFIG.sheets.scriptUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify({
          action:     'uploadPhoto',
          studentId,
          base64Data: base64,
          mimeType:   _photoFile.type || 'image/jpeg',
          fileName:   `student_${studentId}.jpg`,
        }),
      });

      const text = await response.text();
      console.log('[Photo upload] raw response:', text.slice(0, 200));

      let data;
      try { data = JSON.parse(text); }
      catch(e) { throw new Error('Response not JSON: ' + text.slice(0, 100)); }

      if (data.url) {
        sessionStorage.setItem('photo_' + studentId, data.url);
        _photoFile = null;
        if (status) status.textContent = '✅ تم رفع الصورة بنجاح!';
        UI.toast('✅ تم رفع صورة المخدوم');
      } else {
        const errMsg = data.error ?? JSON.stringify(data);
        console.error('[Photo upload] error:', errMsg);
        if (status) status.textContent = '❌ ' + errMsg;
      }
    } catch(e) {
      if (status) status.textContent = '❌ فشل الاتصال';
      console.warn('[Photo upload]', e);
    }
  };
  // ─────────────────────────────────────────

  Router.onEnter('edit', _onEnter);

  return { init, open };
})();
