// ─────────────────────────────────────────────
//  ui/login.js  —  Login screen
// ─────────────────────────────────────────────

const LoginScreen = (() => {
  const init = () => {
    _populateClasses();
    Utils.on('login-btn',  'click', _submit);
    Utils.on('login-name', 'keydown', e => { if (e.key === 'Enter') _submit(); });
  };

  const _populateClasses = () => {
    const sel    = Utils.el('login-class');
    const classes = State.get('classes');

    // Keep the empty placeholder; remove old dynamic options
    while (sel.options.length > 1) sel.remove(1);

    // Add class options
    classes.forEach(c => {
      const opt = new Option(c.name, c.id);
      sel.add(opt, sel.options[sel.options.length]);
    });

    // Admin option always last
    sel.add(new Option('أمين الخدمة 🔑', 'admin'));
  };

  const _submit = () => {
    const name = Utils.el('login-name').value.trim();
    const cls  = Utils.el('login-class').value;
    const err  = Utils.el('login-error');

    if (!name) { err.textContent = 'اكتب اسمك أولاً'; return; }
    if (!cls)  { err.textContent = 'اختار فصلك';       return; }

    if (cls === 'admin') {
      const pass = prompt('كلمة مرور أمين الخدمة:');
      if (pass !== CONFIG.auth.adminPassword) { err.textContent = 'كلمة مرور غير صحيحة'; return; }
    }

    err.textContent = '';
    State.setUser({
      displayName: name,
      classId:     cls,
      role:        cls === 'admin' ? 'admin' : 'servant',
    });

    Router.go('home');
  };

  // Re-populate class list whenever students data is refreshed
  State.on('studentsLoaded', _populateClasses);

  return { init };
})();
