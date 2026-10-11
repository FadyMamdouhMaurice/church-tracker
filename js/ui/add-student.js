// ─────────────────────────────────────────────
//  ui/add-student.js
//  Add new student — admin or servant (own class)
//  Saves to Google Sheet via Apps Script
// ─────────────────────────────────────────────

const AddStudentScreen = (() => {

  const AREAS = ['أرض الجنينة','الخصوص','عرب الطوايلة','زهور يمين','زهور شمال','حول الكنيسة','زهور'];

  const init = () => {
    Utils.on('add-student-back', 'click', () => Router.back());
    Utils.on('add-student-save', 'click', _save);
    Utils.el('add-deacon-toggle')?.addEventListener('change', function() {
      this.nextElementSibling.nextElementSibling.textContent = this.checked ? 'شماس ✓' : 'ليس شماساً';
    });
    Utils.el('add-lords-toggle')?.addEventListener('change', function() {
      this.nextElementSibling.nextElementSibling.textContent = this.checked ? 'أخوة الرب ✓' : 'لا';
    });
  };

  const _onEnter = () => _render();

  const _render = () => {
    const user    = State.get('user');
    const isAdmin = user?.role === 'admin';

    // Servant can only add to own class; admin can choose
    const classOptions = isAdmin
      ? CONFIG.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')
      : (() => {
          const myClass = State.getMyClass();
          return myClass ? `<option value="${myClass.id}" selected>${myClass.name}</option>` : '';
        })();

    Utils.html('add-student-content', `
      <div class="edit-section">
        <div class="edit-section__title">👦 البيانات الأساسية</div>
        <div class="form-group">
          <label>الفصل <span style="color:var(--red)">*</span></label>
          <select id="add-cls" class="class-switcher-sel" ${!isAdmin ? 'disabled' : ''}>
            ${classOptions}
          </select>
        </div>
        <div class="form-group">
          <label>الاسم الكامل <span style="color:var(--red)">*</span></label>
          <input id="add-name" type="text" placeholder="الاسم الرباعي">
        </div>
        <div class="form-group">
          <label>تاريخ الميلاد</label>
          <input id="add-birthday" type="date">
        </div>
        <div class="form-group">
          <label>العنوان</label>
          <textarea id="add-address" class="edit-textarea" rows="2" placeholder="العنوان بالتفصيل"></textarea>
        </div>
        <div class="form-group">
          <label>المنطقة</label>
          <select id="add-area" class="class-switcher-sel">
            <option value="">— اختار المنطقة —</option>
            ${AREAS.map(a => `<option value="${a}">${a}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>المدرسة</label>
          <input id="add-school" type="text">
        </div>
      </div>

      <div class="edit-section">
        <div class="edit-section__title">📱 أرقام التواصل</div>
        <div class="form-group">
          <label>تليفون الولد</label>
          <input id="add-phone-child" type="tel" placeholder="01XXXXXXXXX">
        </div>
        <div class="form-group">
          <label>تليفون الأم</label>
          <input id="add-phone-mom" type="tel" placeholder="01XXXXXXXXX">
        </div>
        <div class="form-group">
          <label>تليفون الأب</label>
          <input id="add-phone-dad" type="tel" placeholder="01XXXXXXXXX">
        </div>
      </div>

      <div class="edit-section">
        <div class="edit-section__title">👨‍👩‍👦 بيانات الأسرة</div>
        <div class="form-group">
          <label>وظيفة الأب</label>
          <input id="add-job-dad" type="text">
        </div>
        <div class="form-group">
          <label>وظيفة الأم</label>
          <input id="add-job-mom" type="text">
        </div>
        <div class="form-group">
          <label>أب الاعتراف</label>
          <input id="add-confessor" type="text">
        </div>
        <div class="form-group toggle-row">
          <label class="toggle-label">
            <input type="checkbox" id="add-deacon-toggle">
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            <span>ليس شماساً</span>
          </label>
        </div>
        <div class="form-group toggle-row">
          <label class="toggle-label">
            <input type="checkbox" id="add-lords-toggle">
            <span class="toggle-track"><span class="toggle-thumb"></span></span>
            <span>لا</span>
          </label>
        </div>
      </div>

      <div class="edit-section">
        <div class="edit-section__title">📝 ملاحظات</div>
        <textarea id="add-notes" class="edit-textarea" rows="3" placeholder="أي ملاحظات..."></textarea>
      </div>

      <p id="add-student-error" style="color:var(--red);font-size:13px;text-align:center;min-height:18px;padding:4px"></p>
    `);

    // Re-wire toggles after html rebuild
    Utils.el('add-deacon-toggle')?.addEventListener('change', function() {
      this.nextElementSibling.nextElementSibling.textContent = this.checked ? 'شماس ✓' : 'ليس شماساً';
    });
    Utils.el('add-lords-toggle')?.addEventListener('change', function() {
      this.nextElementSibling.nextElementSibling.textContent = this.checked ? 'أخوة الرب ✓' : 'لا';
    });
  };

  const _val = (id) => Utils.el(id)?.value?.trim() ?? '';

  const _save = async () => {
    const name = _val('add-name');
    const cls  = _val('add-cls');
    const err  = Utils.el('add-student-error');

    if (!name) { if(err) err.textContent = '⚠️ الاسم مطلوب'; return; }
    if (!cls)  { if(err) err.textContent = '⚠️ اختار الفصل'; return; }
    if(err) err.textContent = '';

    const btn = Utils.el('add-student-save');
    btn.disabled    = true;
    btn.textContent = 'جارٍ الإضافة…';

    const student = {
      name:          name,
      cls:           cls,
      birthday:      _val('add-birthday'),
      address:       _val('add-address'),
      area:          _val('add-area'),
      school:        _val('add-school'),
      phones: {
        child: _val('add-phone-child'),
        mom:   _val('add-phone-mom'),
        dad:   _val('add-phone-dad'),
      },
      jobDad:        _val('add-job-dad'),
      jobMom:        _val('add-job-mom'),
      confessor:     _val('add-confessor'),
      deacon:        Utils.el('add-deacon-toggle')?.checked ?? false,
      lordsBrethren: Utils.el('add-lords-toggle')?.checked  ?? false,
      notes:         _val('add-notes'),
    };

    try {
      const res  = await fetch(CONFIG.sheets.scriptUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body:    JSON.stringify({ action: 'addStudent', student }),
      });
      const data = await res.json();

      if (data.status === 'added') {
        UI.toast(`✅ تم إضافة ${name} لـ ${cls.replace(/_/g,' ')}`);
        // Reload students from Sheets
        await Sheets.reloadStudents();
        Router.back();
      } else {
        if(err) err.textContent = '❌ ' + (data.error ?? 'خطأ غير معروف');
        btn.disabled    = false;
        btn.textContent = 'إضافة المخدوم ✓';
      }
    } catch(e) {
      if(err) err.textContent = '❌ فشل الاتصال: ' + e.message;
      btn.disabled    = false;
      btn.textContent = 'إضافة المخدوم ✓';
    }
  };

  Router.onEnter('add-student', _onEnter);
  return { init };
})();
