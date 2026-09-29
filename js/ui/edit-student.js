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
  const _loadCurrentPhoto = async (studentId) => {
    // 1. Check session cache first (fastest)
    const cached = localStorage.getItem('photo_' + studentId);
    if (cached) { _showPreview(cached); return; }

    // 2. Check Firestore for saved photo URL
    try {
      const doc = await firebase.firestore()
        .collection('student_photos').doc(String(studentId)).get();
      if (doc.exists) {
        const url = doc.data().url;
        localStorage.setItem('photo_' + studentId, url);
        _showPreview(url);
      }
    } catch(e) {
      // No photo saved — keep initials, fail silently
    }
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

  // ── Upload to Cloudinary (direct, no backend needed) ──
  const _uploadPhoto = async (studentId) => {
    if (!_photoFile) return;
    const status = Utils.el('photo-status');
    if (status) status.textContent = '⏫ جارٍ ضغط وتحميل الصورة...';

    try {
      // 1. Compress to max 500px, JPEG 0.8
      const compressed = await _compressImage(_photoFile, 500, 0.8);
      const blob       = await (await fetch(compressed)).blob();

      // 2. Build FormData for Cloudinary unsigned upload
      // Note: public_id with folders requires folder creation to be enabled in preset
      const form = new FormData();
      form.append('file',          blob, 'photo.jpg');
      form.append('upload_preset', CONFIG.cloudinary.uploadPreset);
      form.append('tags',          `student_${studentId}`);
      // Don't set public_id — let Cloudinary auto-generate, we track via Firestore

      if (status) status.textContent = '⏫ جارٍ الرفع على Cloudinary...';

      // 3. Upload directly to Cloudinary — no backend, free CORS
      const res  = await fetch(CONFIG.cloudinary.uploadUrl, {
        method: 'POST',
        body:   form,
      });

      // Log full error if not OK
      if (!res.ok) {
        const errText = await res.text();
        console.error('[Photo upload] Cloudinary error:', errText);
        throw new Error(`Cloudinary ${res.status}: ${errText.slice(0, 200)}`);
      }

      const data = await res.json();
      console.log('[Photo upload] Cloudinary OK:', data.secure_url);
      localStorage.setItem('photo_' + studentId, photoUrl);

      // 5. Save URL to Firestore so it persists across sessions
      const photoUrl = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_400/');
      await firebase.firestore().collection('student_photos').doc(String(studentId)).set({
        url:       photoUrl,
        updatedAt: new Date().toISOString(),
        by:        State.get('user')?.displayName ?? '',
      });

      _photoFile = null;
      if (status) status.textContent = '✅ تم رفع الصورة بنجاح!';
      UI.toast('✅ تم رفع صورة المخدوم');

    } catch(e) {
      console.error('[Photo upload]', e.message);
      if (status) status.textContent = '❌ فشل الرفع: ' + e.message;
    }
  };

  // ── Compress image before upload ───────────
  const _compressImage = (file, maxDim, quality) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale  = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w      = Math.round(img.width  * scale);
      const h      = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src     = url;
  });
  // ─────────────────────────────────────────

  Router.onEnter('edit', _onEnter);

  return { init, open };
})();
