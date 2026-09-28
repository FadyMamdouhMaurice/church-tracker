// ─────────────────────────────────────────────
//  ui/events.js  —  Task Management
//  Admin creates events (كرنفال، مؤتمر، etc.)
//  Each event has sections, each section has tasks
//  Tasks assigned to servants with status tracking
// ─────────────────────────────────────────────

const EventsScreen = (() => {

  // ── State ──────────────────────────────────
  let _events     = [];   // loaded from Firestore
  let _view       = 'list';   // 'list' | 'event' | 'section'
  let _activeEvent   = null;
  let _activeSection = null;
  let _unsubscribe   = null;

  const _isAdmin = () => State.get('user')?.role === 'admin';

  // ── Init ───────────────────────────────────
  const init = () => {
    Utils.on('events-back', 'click', _goBack);
  };

  const _onEnter = () => {
    _view          = 'list';
    _activeEvent   = null;
    _activeSection = null;
    _subscribeEvents();
  };

  const _onLeave = () => {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
  };

  // ── Firestore subscription ─────────────────
  const _subscribeEvents = () => {
    if (_unsubscribe) _unsubscribe();
    _unsubscribe = firebase.firestore()
      .collection('events')
      .orderBy('date', 'asc')
      .onSnapshot(snap => {
        _events = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _render();
      }, err => console.warn('[Events]', err));
  };

  // ── Navigation ─────────────────────────────
  const _goBack = () => {
    if (_view === 'section') { _view = 'event'; _activeSection = null; _render(); return; }
    if (_view === 'event')   { _view = 'list';  _activeEvent   = null; _render(); return; }
    Router.back();
  };

  // ── Main render dispatcher ─────────────────
  const _render = () => {
    if (_view === 'list')    _renderList();
    if (_view === 'event')   _renderEvent();
    if (_view === 'section') _renderSection();
  };

  // ══════════════════════════════════════════
  //  VIEW 1 — Event list
  // ══════════════════════════════════════════
  const _renderList = () => {
    Utils.el('events-title').textContent = 'الفعاليات';

    const now      = new Date().toISOString().split('T')[0];
    const upcoming = _events.filter(e => e.date >= now);
    const past     = _events.filter(e => e.date <  now);

    Utils.html('events-content', `
      ${_isAdmin() ? `
        <button class="ev-add-btn" id="ev-new-btn">＋ فعالية جديدة</button>` : ''}

      ${upcoming.length === 0 && past.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state__icon">📅</div>
          <p>لا توجد فعاليات بعد</p>
          ${_isAdmin() ? '<p style="font-size:13px;color:var(--text-2)">اضغط "فعالية جديدة" لإضافة أول فعالية</p>' : ''}
        </div>` : ''}

      ${upcoming.length > 0 ? `
        <h3 class="section-title">📅 القادمة</h3>
        <div class="ev-list">${upcoming.map(_eventCard).join('')}</div>` : ''}

      ${past.length > 0 ? `
        <h3 class="section-title" style="margin-top:16px">✅ المنتهية</h3>
        <div class="ev-list ev-list--past">${past.map(_eventCard).join('')}</div>` : ''}
    `);

    Utils.on('ev-new-btn', 'click', _showNewEventForm);
    Utils.el('events-content')?.addEventListener('click', e => {
      const card = e.target.closest('.ev-card');
      if (card) { _activeEvent = _events.find(ev => ev.id === card.dataset.id); _view = 'event'; _render(); }
    });
  };

  const _eventCard = (ev) => {
    const sections  = ev.sections ?? [];
    const allTasks  = sections.flatMap(s => s.tasks ?? []);
    const done      = allTasks.filter(t => t.status === 'done').length;
    const total     = allTasks.length;
    const pct       = total ? Math.round(done / total * 100) : 0;
    const typeEmoji = { كرنفال:'🎪', مؤتمر:'🎤', رحلة:'🚌', قداس:'⛪', خدمة:'🙏' }[ev.type] ?? '📅';

    return `
      <div class="ev-card" data-id="${ev.id}">
        <div class="ev-card__top">
          <div class="ev-card__icon">${typeEmoji}</div>
          <div class="ev-card__info">
            <div class="ev-card__name">${ev.name}</div>
            <div class="ev-card__meta">${_formatDate(ev.date)} · ${ev.type ?? ''}</div>
          </div>
          <div class="ev-card__arrow">›</div>
        </div>
        ${total > 0 ? `
          <div class="ev-progress">
            <div class="ev-progress__bar">
              <div class="ev-progress__fill" style="width:${pct}%"></div>
            </div>
            <span class="ev-progress__label">${done}/${total} مهمة</span>
          </div>` : `<div class="ev-progress__label ev-progress__label--empty">لا توجد مهام بعد</div>`}
      </div>`;
  };

  // ══════════════════════════════════════════
  //  VIEW 2 — Single event (sections list)
  // ══════════════════════════════════════════
  const _renderEvent = () => {
    if (!_activeEvent) { _view = 'list'; _render(); return; }
    const ev       = _activeEvent;
    const sections = ev.sections ?? [];
    const allTasks = sections.flatMap(s => s.tasks ?? []);
    const done     = allTasks.filter(t => t.status === 'done').length;
    const pct      = allTasks.length ? Math.round(done / allTasks.length * 100) : 0;

    Utils.el('events-title').textContent = ev.name;

    Utils.html('events-content', `
      <!-- Event header -->
      <div class="ev-header-card">
        <div class="ev-header-card__date">📅 ${_formatDate(ev.date)}</div>
        ${ev.description ? `<div class="ev-header-card__desc">${ev.description}</div>` : ''}
        <div class="ev-header-card__progress">
          <div class="ev-progress__bar ev-progress__bar--lg">
            <div class="ev-progress__fill" style="width:${pct}%"></div>
          </div>
          <span>${done} من ${allTasks.length} مهمة منتهية (${pct}%)</span>
        </div>
      </div>

      <!-- Sections -->
      ${_isAdmin() ? `
        <button class="ev-add-btn ev-add-btn--sec" id="ev-new-sec-btn">＋ فقرة جديدة</button>` : ''}

      ${sections.length === 0
        ? `<div class="empty-state"><div class="empty-state__icon">📋</div><p>لا توجد فقرات بعد</p></div>`
        : `<div class="ev-sections">${sections.map((sec, si) => _sectionCard(sec, si)).join('')}</div>`}

      ${_isAdmin() ? `
        <button class="ev-delete-btn" id="ev-delete-event-btn">🗑️ حذف الفعالية</button>` : ''}
    `);

    Utils.on('ev-new-sec-btn',      'click', _showNewSectionForm);
    Utils.on('ev-delete-event-btn', 'click', _deleteEvent);

    Utils.el('events-content')?.addEventListener('click', e => {
      const card = e.target.closest('.ev-section-card');
      if (card && !e.target.closest('button')) {
        const si = parseInt(card.dataset.si, 10);
        _activeSection = { ...(_activeEvent.sections[si]), _si: si };
        _view = 'section';
        _render();
      }
    });
  };

  const _sectionCard = (sec, si) => {
    const tasks   = sec.tasks ?? [];
    const done    = tasks.filter(t => t.status === 'done').length;
    const pct     = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    const user    = State.get('user');
    const isMyTask = !_isAdmin() && tasks.some(t => t.assignee === user?.displayName);

    return `
      <div class="ev-section-card ${isMyTask ? 'ev-section-card--mine' : ''}" data-si="${si}">
        <div class="ev-section-card__top">
          <div class="ev-section-card__info">
            <div class="ev-section-card__name">${sec.name}</div>
            ${sec.leader ? `<div class="ev-section-card__leader">👑 ليدر: ${sec.leader}</div>` : ''}
          </div>
          <div class="ev-section-card__arrow">›</div>
        </div>
        <div class="ev-progress">
          <div class="ev-progress__bar">
            <div class="ev-progress__fill" style="width:${pct}%"></div>
          </div>
          <span class="ev-progress__label">${done}/${tasks.length}</span>
        </div>
        ${isMyTask ? '<div class="ev-section-card__badge">عندك مهام هنا 👆</div>' : ''}
      </div>`;
  };

  // ══════════════════════════════════════════
  //  VIEW 3 — Section detail (tasks)
  // ══════════════════════════════════════════
  const _renderSection = () => {
    if (!_activeSection) { _view = 'event'; _render(); return; }
    const sec   = _activeSection;
    const tasks = sec.tasks ?? [];
    const user  = State.get('user');
    const done  = tasks.filter(t => t.status === 'done').length;

    Utils.el('events-title').textContent = sec.name;

    Utils.html('events-content', `
      ${sec.leader ? `
        <div class="ev-leader-badge">👑 ليدر الفقرة: <b>${sec.leader}</b></div>` : ''}

      <div class="ev-tasks-summary">
        ${done} من ${tasks.length} مهام منتهية
      </div>

      ${_isAdmin() ? `
        <button class="ev-add-btn" id="ev-new-task-btn">＋ مهمة جديدة</button>` : ''}

      <div class="ev-tasks" id="ev-tasks-list">
        ${tasks.length === 0
          ? `<div class="empty-state"><div class="empty-state__icon">✅</div><p>لا توجد مهام بعد</p></div>`
          : tasks.map((t, ti) => _taskRow(t, ti, user)).join('')}
      </div>
    `);

    Utils.on('ev-new-task-btn', 'click', _showNewTaskForm);

    Utils.el('ev-tasks-list')?.addEventListener('click', async e => {
      // Toggle done
      const row = e.target.closest('.ev-task-row');
      if (!row) return;

      // Only assignee or admin can toggle
      const ti   = parseInt(row.dataset.ti, 10);
      const task = tasks[ti];
      const isAssignee = task.assignee === user?.displayName;
      if (!_isAdmin() && !isAssignee) {
        UI.toast('فقط المسؤول عن المهمة يقدر يغيّر حالتها');
        return;
      }

      // Delete button (admin only)
      if (e.target.closest('.ev-task-delete') && _isAdmin()) {
        await _deleteTask(ti); return;
      }

      // Toggle status
      const newStatus = task.status === 'done' ? 'pending' : 'done';
      await _updateTaskStatus(ti, newStatus);
    });
  };

  const _taskRow = (t, ti, user) => {
    const isDone     = t.status === 'done';
    const isAssignee = t.assignee === user?.displayName;
    const canToggle  = _isAdmin() || isAssignee;

    return `
      <div class="ev-task-row ${isDone ? 'ev-task-row--done' : ''} ${isAssignee ? 'ev-task-row--mine' : ''}"
           data-ti="${ti}" style="${canToggle ? 'cursor:pointer' : ''}">
        <div class="ev-task-row__check ${isDone ? 'ev-task-row__check--done' : ''}">
          ${isDone ? '✅' : '⬜'}
        </div>
        <div class="ev-task-row__info">
          <div class="ev-task-row__name ${isDone ? 'ev-task-row__name--done' : ''}">${t.name}</div>
          ${t.assignee ? `<div class="ev-task-row__assignee">👤 ${t.assignee}</div>` : ''}
          ${t.note ? `<div class="ev-task-row__note">📝 ${t.note}</div>` : ''}
        </div>
        ${_isAdmin() ? `<button class="ev-task-delete" data-ti="${ti}">🗑️</button>` : ''}
      </div>`;
  };

  // ══════════════════════════════════════════
  //  FORMS — New Event / Section / Task
  // ══════════════════════════════════════════
  const _allServants = () =>
    CONFIG.classes.flatMap(c => c.servants);

  const _showNewEventForm = () => {
    const overlay = _createOverlay(`
      <div class="modal ev-form-modal">
        <h3 class="modal__title">➕ فعالية جديدة</h3>
        <div class="form-group">
          <label>اسم الفعالية</label>
          <input id="evf-name" type="text" placeholder="مثال: كرنفال الصيف 2026">
        </div>
        <div class="form-group">
          <label>النوع</label>
          <select id="evf-type">
            <option>كرنفال</option><option>مؤتمر</option>
            <option>رحلة</option><option>قداس</option><option>خدمة</option><option>أخرى</option>
          </select>
        </div>
        <div class="form-group">
          <label>التاريخ</label>
          <input id="evf-date" type="date" value="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label>وصف (اختياري)</label>
          <textarea id="evf-desc" class="edit-textarea" rows="2" placeholder="تفاصيل الفعالية..."></textarea>
        </div>
        <div class="modal__btns">
          <button class="btn btn--gray" id="evf-cancel">إلغاء</button>
          <button class="btn btn--primary" id="evf-save">حفظ</button>
        </div>
      </div>`);

    Utils.on('evf-cancel', 'click', () => overlay.remove());
    Utils.on('evf-save',   'click', async () => {
      const name = Utils.el('evf-name').value.trim();
      const date = Utils.el('evf-date').value;
      if (!name) { UI.toast('اكتب اسم الفعالية'); return; }
      if (!date) { UI.toast('اختار التاريخ'); return; }

      Utils.el('evf-save').disabled = true;
      await firebase.firestore().collection('events').add({
        name, date,
        type:        Utils.el('evf-type').value,
        description: Utils.el('evf-desc').value.trim(),
        sections:    [],
        createdBy:   State.get('user')?.displayName ?? '',
        createdAt:   new Date().toISOString(),
      });
      overlay.remove();
      UI.toast('✅ تم إنشاء الفعالية');
    });
  };

  const _showNewSectionForm = () => {
    const servants = _allServants();
    const overlay = _createOverlay(`
      <div class="modal ev-form-modal">
        <h3 class="modal__title">➕ فقرة جديدة</h3>
        <div class="form-group">
          <label>اسم الفقرة</label>
          <input id="evs-name" type="text" placeholder="مثال: التوزيع، الديكور، الأكل...">
        </div>
        <div class="form-group">
          <label>ليدر الفقرة</label>
          <select id="evs-leader">
            <option value="">— بدون ليدر —</option>
            ${servants.map(n => `<option>${n}</option>`).join('')}
          </select>
        </div>
        <div class="modal__btns">
          <button class="btn btn--gray" id="evs-cancel">إلغاء</button>
          <button class="btn btn--primary" id="evs-save">حفظ</button>
        </div>
      </div>`);

    Utils.on('evs-cancel', 'click', () => overlay.remove());
    Utils.on('evs-save',   'click', async () => {
      const name = Utils.el('evs-name').value.trim();
      if (!name) { UI.toast('اكتب اسم الفقرة'); return; }

      Utils.el('evs-save').disabled = true;
      const ev       = _activeEvent;
      const sections = [...(ev.sections ?? []), {
        name,
        leader: Utils.el('evs-leader').value || '',
        tasks:  [],
      }];
      await firebase.firestore().collection('events').doc(ev.id).update({ sections });
      overlay.remove();
      UI.toast('✅ تم إضافة الفقرة');
    });
  };

  const _showNewTaskForm = () => {
    const servants = _allServants();
    const overlay = _createOverlay(`
      <div class="modal ev-form-modal">
        <h3 class="modal__title">➕ مهمة جديدة</h3>
        <div class="form-group">
          <label>اسم المهمة</label>
          <input id="evt-name" type="text" placeholder="مثال: شراء الأكواب، تركيب الديكور...">
        </div>
        <div class="form-group">
          <label>المسؤول</label>
          <select id="evt-assignee">
            <option value="">— غير محدد —</option>
            ${servants.map(n => `<option>${n}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>ملاحظة (اختياري)</label>
          <input id="evt-note" type="text" placeholder="تفاصيل إضافية...">
        </div>
        <div class="modal__btns">
          <button class="btn btn--gray" id="evt-cancel">إلغاء</button>
          <button class="btn btn--primary" id="evt-save">حفظ</button>
        </div>
      </div>`);

    Utils.on('evt-cancel', 'click', () => overlay.remove());
    Utils.on('evt-save',   'click', async () => {
      const name = Utils.el('evt-name').value.trim();
      if (!name) { UI.toast('اكتب اسم المهمة'); return; }

      Utils.el('evt-save').disabled = true;
      const ev       = _activeEvent;
      const si       = _activeSection._si;
      const sections = JSON.parse(JSON.stringify(ev.sections));
      sections[si].tasks = [...(sections[si].tasks ?? []), {
        name,
        assignee: Utils.el('evt-assignee').value || '',
        note:     Utils.el('evt-note').value.trim(),
        status:   'pending',
        createdAt: new Date().toISOString(),
      }];
      await firebase.firestore().collection('events').doc(ev.id).update({ sections });

      // Notify assignee if FCM available
      const assignee = Utils.el('evt-assignee').value;
      if (assignee) {
        await firebase.firestore().collection('notification_requests').add({
          type:      'task_assigned',
          title:     `📋 مهمة جديدة — ${ev.name}`,
          body:      `${assignee}: ${name} في فقرة "${sections[si].name}"`,
          targetName: assignee,
          createdAt: new Date().toISOString(),
          sent:      false,
        });
      }

      overlay.remove();
      UI.toast('✅ تم إضافة المهمة');
    });
  };

  // ── Update task status ─────────────────────
  const _updateTaskStatus = async (ti, newStatus) => {
    const ev       = _activeEvent;
    const si       = _activeSection._si;
    const sections = JSON.parse(JSON.stringify(ev.sections));
    sections[si].tasks[ti].status    = newStatus;
    sections[si].tasks[ti].doneAt    = newStatus === 'done' ? new Date().toISOString() : null;
    sections[si].tasks[ti].doneBy    = newStatus === 'done' ? State.get('user')?.displayName : null;
    await firebase.firestore().collection('events').doc(ev.id).update({ sections });
    // Update local state for instant feedback
    _activeSection = { ...sections[si], _si: si };
    _render();
  };

  // ── Delete helpers ─────────────────────────
  const _deleteTask = async (ti) => {
    const ev       = _activeEvent;
    const si       = _activeSection._si;
    const sections = JSON.parse(JSON.stringify(ev.sections));
    sections[si].tasks.splice(ti, 1);
    await firebase.firestore().collection('events').doc(ev.id).update({ sections });
    _activeSection = { ...sections[si], _si: si };
    _render();
  };

  const _deleteEvent = async () => {
    if (!confirm(`حذف "${_activeEvent.name}"؟`)) return;
    await firebase.firestore().collection('events').doc(_activeEvent.id).delete();
    _activeEvent = null;
    _view = 'list';
    UI.toast('تم حذف الفعالية');
  };

  // ── Helpers ────────────────────────────────
  const _formatDate = (d) => {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  };

  const _createOverlay = (html) => {
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.innerHTML = html;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    return el;
  };

  Router.onEnter('events', _onEnter);

  return { init, onLeave: _onLeave };
})();
