// ─────────────────────────────────────────────
//  utils.js  —  Shared utility functions
// ─────────────────────────────────────────────

const Utils = (() => {
  // ── Time ago helper ──────────────────────
  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now   = new Date();
    const then  = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    const diff  = Math.floor((now - then) / (1000 * 60 * 60 * 24)); // days
    if (diff === 0) return 'اليوم';
    if (diff === 1) return 'أمس';
    if (diff < 7)   return `منذ ${diff} أيام`;
    const weeks = Math.floor(diff / 7);
    if (weeks === 1) return 'منذ أسبوع';
    if (weeks === 2) return 'منذ أسبوعين';
    if (weeks < 5)   return `منذ ${weeks} أسابيع`;
    const months = Math.floor(diff / 30);
    if (months === 1) return 'منذ شهر';
    if (months === 2) return 'منذ شهرين';
    if (months < 12)  return `منذ ${months} أشهر`;
    const years = Math.floor(diff / 365);
    if (years === 1) return 'منذ سنة';
    return `منذ ${years} سنوات`;
  };

  // ── Date helpers ──────────────────────────
  const today = () => new Date().toISOString().split('T')[0];

  const daysSince = (dateStr) =>
    Math.floor((Date.now() - new Date(dateStr)) / 86_400_000);

  const weekKey = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + CONFIG.attendance.weekStartDay + offset * 7);
    return d.toISOString().split('T')[0];
  };

  const weekLabel = (dateStr) =>
    'أسبوع ' + new Date(dateStr).toLocaleDateString('ar-EG', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const buildWeekOptions = (selectEl, count = CONFIG.attendance.weeksToShow) => {
    selectEl.innerHTML = Array.from({ length: count }, (_, i) => {
      const k = weekKey(-i);
      return `<option value="${k}"${i === 0 ? ' selected' : ''}>${weekLabel(k)}</option>`;
    }).join('');
  };

  // ── DOM helpers ───────────────────────────
  const el = (id) => document.getElementById(id);

  const html = (id, content) => {
    const node = el(id);
    if (node) node.innerHTML = content;
  };

  const show = (id) => { const n = el(id); if (n) n.style.display = ''; };
  const hide = (id) => { const n = el(id); if (n) n.style.display = 'none'; };

  const on = (id, event, handler) => {
    const node = el(id);
    if (node) node.addEventListener(event, handler);
  };

  // ── String helpers ────────────────────────
  const truncate = (str, max = 50) =>
    str && str.length > max ? str.slice(0, max) + '…' : (str ?? '');

  const initials = (name) => name?.[0] ?? '?';

  return { today, daysSince, weekKey, weekLabel, formatDate,
           buildWeekOptions, el, html, show, hide, on,
           truncate, initials, timeAgo };
})();
