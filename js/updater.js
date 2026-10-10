// ─────────────────────────────────────────────
//  updater.js  —  PWA update detection & prompt
// ─────────────────────────────────────────────

const Updater = (() => {

  const init = () => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(reg => {
      setInterval(() => reg.update(), 60_000);

      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            _showUpdateBanner(newSW);
          }
        });
      });
    });

    // Only reload on controllerchange if it was triggered by user pressing "Update"
    // NOT on every page load (prevents infinite reload loop)
    let _reloadPending = false;
    window._triggerSWReload = () => { _reloadPending = true; };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (_reloadPending) window.location.reload();
    });
  };

  const _showUpdateBanner = (newSW) => {
    document.getElementById('update-banner')?.remove();

    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.innerHTML = `
      <span>📲 يوجد تحديث جديد للتطبيق</span>
      <button id="update-now-btn">تحديث الآن</button>
      <button id="update-later-btn">لاحقاً</button>
    `;
    banner.style.cssText = `
      position: fixed;
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      left: 50%;
      transform: translateX(-50%);
      background: #1a3a6b;
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      font-family: system-ui, sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,.3);
      z-index: 9999;
      white-space: nowrap;
      max-width: calc(100vw - 32px);
      flex-wrap: wrap;
      justify-content: center;
    `;

    const btnStyle = `
      border: none;
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    `;

    document.body.appendChild(banner);

    document.getElementById('update-now-btn').style.cssText =
      btnStyle + 'background: white; color: #1a3a6b;';
    document.getElementById('update-later-btn').style.cssText =
      btnStyle + 'background: rgba(255,255,255,.2); color: white;';

    document.getElementById('update-now-btn').addEventListener('click', () => {
      banner.remove();
      window._triggerSWReload();
      newSW.postMessage({ type: 'SKIP_WAITING' });
    });

    document.getElementById('update-later-btn').addEventListener('click', () => {
      banner.remove();
    });

    setTimeout(() => banner.remove(), 30_000);
  };

  return { init };
})();
