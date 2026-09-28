// ─────────────────────────────────────────────
//  ui.js  —  Shared UI: toast, offline bar, modal
// ─────────────────────────────────────────────

const UI = (() => {
  let _toastTimer = null;

  // ── Toast notification ────────────────────
  const toast = (msg, duration = 2800) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
  };

  // ── Offline banner ────────────────────────
  const initOfflineBanner = () => {
    const bar = document.getElementById('offline-bar');
    if (!bar) return;
    const update = () => bar.classList.toggle('show', !navigator.onLine);
    update();
    window.addEventListener('online',  update);
    window.addEventListener('offline', update);
  };

  // ── Modal ─────────────────────────────────
  const modal = {
    _resolve: null,

    open: ({ title, placeholder = '' }) => new Promise(resolve => {
      modal._resolve = resolve;
      Utils.el('modal-title').textContent = title;
      Utils.el('modal-text').value = '';
      Utils.el('modal-text').placeholder = placeholder;
      Utils.el('note-modal').classList.remove('hidden');
      Utils.el('modal-text').focus();
    }),

    confirm: () => {
      const value = Utils.el('modal-text').value.trim();
      Utils.el('note-modal').classList.add('hidden');
      modal._resolve?.(value);
      modal._resolve = null;
    },

    cancel: () => {
      Utils.el('note-modal').classList.add('hidden');
      modal._resolve?.(null);
      modal._resolve = null;
    },
  };

  // ── Badge helpers ─────────────────────────
  const badge = (text, type) => `<span class="badge badge--${type}">${text}</span>`;

  const recordBadge = (record) => {
    const map = {
      attendance: record.present ? [' حضر ✅', 'green'] : ['غاب ❌', 'red'],
      call:  ['📞 مكالمة', 'orange'],
      visit: ['🏠 افتقاد', 'purple'],
    };
    const [text, type] = map[record.type] ?? [record.type, 'gray'];
    return badge(text, type);
  };

  // ── Status dots ───────────────────────────
  const statusDots = (studentId) => {
    const records = State.get('records');
    const wk      = Utils.weekKey();

    const att   = records.find(r => r.type === 'attendance' && r.week === wk && r.studentId === studentId);
    const lastC = records.filter(r => r.type === 'call'  && r.studentId === studentId)[0];
    const lastV = records.filter(r => r.type === 'visit' && r.studentId === studentId)[0];

    const attClass  = att ? (att.present ? 'green' : 'red') : 'gray';
    const callClass = lastC && Utils.daysSince(lastC.date) <= CONFIG.followup.callWarningDays  ? 'green' : 'gray';
    const visClass  = lastV && Utils.daysSince(lastV.date) <= CONFIG.followup.visitWarningDays ? 'green' : 'gray';

    return `
      <div class="status-dots">
        <span class="dot dot--${attClass}"  title="حضور"></span>
        <span class="dot dot--${callClass}" title="مكالمة"></span>
        <span class="dot dot--${visClass}"  title="افتقاد"></span>
      </div>`;
  };

  return { toast, initOfflineBanner, modal, badge, recordBadge, statusDots };
})();
