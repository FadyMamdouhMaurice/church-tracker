// ─────────────────────────────────────────────
//  router.js  —  Screen navigation
//  Uses History API so Android back button works
// ─────────────────────────────────────────────

const Router = (() => {
  const SCREENS = ['login','loading','home','students','attendance','profile','admin','servant-att'];
  let _stack  = [];
  let _mode   = 'profile';
  let _hooks  = {};
  let _ignorePopState = false;

  const onEnter = (screen, fn) => { _hooks[screen] = fn; };

  const go = (screen, mode = null) => {
    if (mode) _mode = mode;

    // Activate the right screen
    SCREENS.forEach(s => {
      document.getElementById(`${s}-screen`)?.classList.toggle('active', s === screen);
    });

    if (screen !== 'login' && screen !== 'loading') {
      if (_stack.at(-1) !== screen) {
        _stack.push(screen);
        // Push a history entry so the OS back button triggers popstate
        history.pushState({ screen, mode: _mode }, '', '');
      }
    } else {
      _stack = [];
      // Replace state so swiping back doesn't leave an orphan entry
      history.replaceState({ screen }, '', '');
    }

    _hooks[screen]?.(_mode);
    window.scrollTo(0, 0);
  };

  const back = () => {
    if (_stack.length <= 1) return; // nothing to go back to
    _ignorePopState = true;
    _stack.pop();
    history.back();
    const prev = _stack.at(-1) ?? 'home';
    SCREENS.forEach(s => {
      document.getElementById(`${s}-screen`)?.classList.toggle('active', s === prev);
    });
    _hooks[prev]?.(_mode);
    window.scrollTo(0, 0);
    setTimeout(() => { _ignorePopState = false; }, 50);
  };

  // Handle OS / browser back button
  window.addEventListener('popstate', (e) => {
    if (_ignorePopState) return;

    if (_stack.length <= 1) {
      // At root — push a new state so the next back press is also caught
      history.pushState({ screen: _stack[0] ?? 'home' }, '', '');
      return;
    }

    _stack.pop();
    const prev = _stack.at(-1) ?? 'home';
    SCREENS.forEach(s => {
      document.getElementById(`${s}-screen`)?.classList.toggle('active', s === prev);
    });
    _hooks[prev]?.(_mode);
    window.scrollTo(0, 0);
  });

  const getMode = () => _mode;

  return { go, back, onEnter, getMode };
})();
