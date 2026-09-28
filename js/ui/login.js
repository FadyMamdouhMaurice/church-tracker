// ─────────────────────────────────────────────
//  ui/login.js  —  Login screen
//  Flow: select class → select name → enter
// ─────────────────────────────────────────────

const LoginScreen = (() => {

  const init = () => {
    _buildClassDropdown();
    Utils.on('login-class',   'change', _onClassChange);
    Utils.on('login-servant', 'change', _onServantChange);
    Utils.on('login-btn',     'click',  _submit);
    Utils.on('login-name',    'keydown', e => { if (e.key === 'Enter') _submit(); });
  };

  // ── Step 1: populate class dropdown ─────────
  const _buildClassDropdown = () => {
    const sel = Utils.el('login-class');
    sel.innerHTML = '<option value="">— اختار الفصل —</option>';

    CONFIG.classes.forEach(c => {
      const opt = new Option(c.name, c.id);
      sel.add(opt);
    });

    // Admin option always last
    sel.add(new Option('أمين الخدمة 🔑', '__admin__'));

    // Reset servant dropdown
    _resetServantDropdown();
  };

  // ── Step 2: populate servant dropdown ───────
  const _onClassChange = () => {
    const classId = Utils.el('login-class').value;
    const nameRow = Utils.el('login-name-row');
    const passRow = Utils.el('login-pass-row');
    const servRow = Utils.el('login-servant-row');
    const btn     = Utils.el('login-btn');

    Utils.el('login-error').textContent = '';

    if (!classId) {
      _resetServantDropdown();
      nameRow?.style.setProperty('display', 'none');
      passRow?.style.setProperty('display', 'none');
      btn.disabled = true;
      return;
    }

    if (classId === '__admin__') {
      // Admin flow: show name input + password
      servRow?.style.setProperty('display', 'none');
      nameRow?.style.setProperty('display', '');
      passRow?.style.setProperty('display', '');
      btn.disabled = false;
      Utils.el('login-name').focus();
      return;
    }

    // Servant flow: show name dropdown
    const cls = CONFIG.classes.find(c => c.id === classId);
    if (!cls) return;

    const servSel = Utils.el('login-servant');
    servSel.innerHTML = '<option value="">— اختار اسمك —</option>';
    cls.servants.forEach(name => servSel.add(new Option(name, name)));

    servRow?.style.setProperty('display', '');
    nameRow?.style.setProperty('display', 'none');
    passRow?.style.setProperty('display', 'none');
    btn.disabled = true;
  };

  const _onServantChange = () => {
    const name = Utils.el('login-servant').value;
    Utils.el('login-btn').disabled = !name;
  };

  const _resetServantDropdown = () => {
    const servSel = Utils.el('login-servant');
    servSel.innerHTML = '<option value="">— اختار اسمك —</option>';
    Utils.el('login-servant-row')?.style.setProperty('display', 'none');
    Utils.el('login-name-row')?.style.setProperty('display', 'none');
    Utils.el('login-pass-row')?.style.setProperty('display', 'none');
    Utils.el('login-btn').disabled = true;
  };

  // ── Submit ───────────────────────────────────
  const _submit = () => {
    const classId = Utils.el('login-class').value;
    const err     = Utils.el('login-error');

    if (!classId) { err.textContent = 'اختار الفصل أولاً'; return; }

    if (classId === '__admin__') {
      _submitAdmin();
      return;
    }

    const name = Utils.el('login-servant').value;
    if (!name) { err.textContent = 'اختار اسمك'; return; }

    err.textContent = '';
    State.setUser({ displayName: name, classId, role: 'servant' });
    Router.go('home');
  };

  const _submitAdmin = () => {
    const name = Utils.el('login-name').value.trim();
    const pass = Utils.el('login-pass').value;
    const err  = Utils.el('login-error');

    if (!name) { err.textContent = 'اكتب اسمك'; return; }
    if (pass !== CONFIG.admins.password) { err.textContent = 'كلمة مرور غير صحيحة'; return; }

    // Validate admin name
    if (!CONFIG.admins.names.includes(name)) {
      err.textContent = 'هذا الاسم غير مصرح له كأمين خدمة';
      return;
    }

    err.textContent = '';
    State.setUser({ displayName: name, classId: '__admin__', role: 'admin' });
    Router.go('home');
  };

  return { init };
})();
