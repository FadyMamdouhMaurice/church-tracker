// ─────────────────────────────────────────────
//  router.js  —  Screen navigation
// ─────────────────────────────────────────────

const Router = (() => {
  const SCREENS = ['login', 'loading', 'home', 'students', 'attendance', 'profile', 'admin'];
  let _stack  = [];
  let _mode   = 'profile'; // current action mode for student list

  // Called by each screen's module when it's activated
  const _hooks = {};
  const onEnter = (screen, fn) => { _hooks[screen] = fn; };

  const go = (screen, mode = null) => {
    if (mode) _mode = mode;

    SCREENS.forEach(s => {
      document.getElementById(`${s}-screen`)?.classList.toggle('active', s === screen);
    });

    if (screen !== 'login' && screen !== 'loading') {
      if (_stack.at(-1) !== screen) _stack.push(screen);
    } else {
      _stack = [];
    }

    _hooks[screen]?.(_mode);
    window.scrollTo(0, 0);
  };

  const back = () => {
    _stack.pop();
    go(_stack.at(-1) ?? 'home');
  };

  const getMode = () => _mode;

  return { go, back, onEnter, getMode };
})();
