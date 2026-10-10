// ─────────────────────────────────────────────
//  ui/servant-management.js
//  Admin screen: add / remove / transfer servants
//  Changes are saved to Firestore (servant_config collection)
//  and merged with CONFIG.classes at runtime
// ─────────────────────────────────────────────

const ServantManagement = (() => {

  // ── Helpers ───────────────────────────────
  const _allServants = () =>
    CONFIG.classes.flatMap(c =>
      c.servants.map(name => ({ name, classId: c.id, className: c.name }))
    );

  const _clsName = id => CONFIG.classes.find(c => c.id === id)?.name ?? id;

  // ── Stats per servant from Firestore records ──
  const _servantStats = (name) => {
    const records = State.get('records');
    const mine    = records.filter(r => r.by === name);
    const sAtt    = records.filter(r => r.type === 'servant-attendance' && r.servantName === name);
    return {
      att:     mine.filter(r => r.type === 'attendance').length,
      calls:   mine.filter(r => r.type === 'call').length,
      visits:  mine.filter(r => r.type === 'visit').length,
      lesson:  sAtt.filter(r => r.lesson).length,
      present: sAtt.filter(r => r.present).length,
      total:   sAtt.length,
    };
  };

  // ══════════════════════════════════════════
  //  Show modal — called from admin.js
  // ══════════════════════════════════════════
  const showModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id        = 'servant-mgmt-overlay';
    overlay.innerHTML = `
      <div class="modal servant-mgmt-modal">
        <div class="servant-mgmt-modal__header">
          <h3>إدارة الخدام</h3>
          <button id="smgmt-close" class="smgmt-close-btn">✕</button>
        </div>
        <div class="tab-bar" style="margin-bottom:12px">
          <button class="tab active" id="smgmt-tab-list"     >📋 الخدام</button>
          <button class="tab"        id="smgmt-tab-add"      >➕ إضافة</button>
          <button class="tab"        id="smgmt-tab-transfer" >🔀 نقل</button>
        </div>
        <div id="smgmt-content"></div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    Utils.on('smgmt-close',        'click', () => overlay.remove());
    Utils.on('smgmt-tab-list',     'click', () => _switchTab('list'));
    Utils.on('smgmt-tab-add',      'click', () => _switchTab('add'));
    Utils.on('smgmt-tab-transfer', 'click', () => _switchTab('transfer'));

    _switchTab('list');
  };

  const _switchTab = (tab) => {
    ['list','add','transfer'].forEach(t => {
      Utils.el(`smgmt-tab-${t}`)?.classList.toggle('active', t === tab);
    });
    if (tab === 'list')     _renderList();
    if (tab === 'add')      _renderAdd();
    if (tab === 'transfer') _renderTransfer();
  };

  // ── Tab 1: List all servants ──────────────
  const _renderList = () => {
    const servants = _allServants();
    const byClass  = CONFIG.classes.map(c => ({
      cls:      c,
      servants: c.servants.map(n => ({ name: n, stats: _servantStats(n) })),
    }));

    Utils.html('smgmt-content', `
      <div class="smgmt-list">
        ${byClass.map(({ cls, servants }) => `
          <div class="smgmt-class-block">
            <div class="smgmt-class-title">${cls.name.replace('فصل ','')}</div>
            ${servants.map(s => `
              <div class="smgmt-servant-row">
                <div class="smgmt-servant-row__avatar">${s.name[0]}</div>
                <div class="smgmt-servant-row__info">
                  <div class="smgmt-servant-row__name">${s.name}</div>
                  <div class="smgmt-servant-row__stats">
                    📋${s.stats.att} · 📞${s.stats.calls} · 🏠${s.stats.visits} · 📖${s.stats.lesson}
                    ${s.stats.total > 0 ? ` · حضور ${Math.round(s.stats.present/s.stats.total*100)}%` : ''}
                  </div>
                </div>
                <button class="smgmt-delete-btn" data-name="${s.name}" data-cls="${cls.id}"
                        title="حذف الخادم">🗑️</button>
              </div>`).join('')}
          </div>`).join('')}
      </div>
    `);

    Utils.el('smgmt-content')?.addEventListener('click', async e => {
      const btn = e.target.closest('.smgmt-delete-btn');
      if (!btn) return;
      await _deleteServant(btn.dataset.name, btn.dataset.cls);
    });
  };

  // ── Tab 2: Add servant ────────────────────
  const _renderAdd = () => {
    Utils.html('smgmt-content', `
      <div class="smgmt-form">
        <div class="form-group">
          <label>اسم الخادم الجديد</label>
          <input id="smgmt-new-name" type="text" placeholder="الاسم كامل">
        </div>
        <div class="form-group">
          <label>الفصل</label>
          <select id="smgmt-new-cls" class="class-switcher-sel">
            ${CONFIG.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <p id="smgmt-add-err" style="color:var(--red);font-size:13px;min-height:16px"></p>
        <button class="btn btn--primary" id="smgmt-add-btn">➕ إضافة الخادم</button>
      </div>
    `);

    Utils.on('smgmt-add-btn', 'click', async () => {
      const name  = Utils.el('smgmt-new-name')?.value?.trim();
      const clsId = Utils.el('smgmt-new-cls')?.value;
      const err   = Utils.el('smgmt-add-err');

      if (!name) { if(err) err.textContent = '⚠️ اكتب اسم الخادم'; return; }

      // Check not already exists
      const exists = _allServants().some(s => s.name === name);
      if (exists) { if(err) err.textContent = '⚠️ الخادم موجود بالفعل'; return; }

      const btn = Utils.el('smgmt-add-btn');
      btn.disabled = true;

      await _saveServantConfig(name, clsId, 'add');
      UI.toast(`✅ تم إضافة ${name}`);
      _switchTab('list');
    });
  };

  // ── Tab 3: Transfer servant ───────────────
  const _renderTransfer = () => {
    const servants = _allServants();
    Utils.html('smgmt-content', `
      <div class="smgmt-form">
        <div class="form-group">
          <label>الخادم</label>
          <select id="smgmt-tr-servant" class="class-switcher-sel">
            <option value="">— اختار الخادم —</option>
            ${servants.map(s => `<option value="${s.name}" data-cls="${s.classId}">${s.name} (${s.className.replace('فصل ','')})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>الفصل الجديد</label>
          <select id="smgmt-tr-cls" class="class-switcher-sel">
            ${CONFIG.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div id="smgmt-tr-stats" class="smgmt-stats-preview" style="display:none"></div>
        <p id="smgmt-tr-err" style="color:var(--red);font-size:13px;min-height:16px"></p>
        <button class="btn btn--primary" id="smgmt-tr-btn">🔀 نقل الخادم</button>
      </div>
    `);

    // Show stats when servant selected
    Utils.el('smgmt-tr-servant')?.addEventListener('change', function() {
      const name  = this.value;
      const stats = _servantStats(name);
      const el    = Utils.el('smgmt-tr-stats');
      if (!name || !el) return;
      el.style.display = '';
      el.innerHTML = `
        <div class="smgmt-stats-grid">
          <div class="smgmt-stat"><span>📋</span>${stats.att}<small>حضور سجله</small></div>
          <div class="smgmt-stat"><span>📞</span>${stats.calls}<small>مكالمات</small></div>
          <div class="smgmt-stat"><span>🏠</span>${stats.visits}<small>افتقادات</small></div>
          <div class="smgmt-stat"><span>📖</span>${stats.lesson}<small>حضّر الدرس</small></div>
        </div>
        <p style="font-size:11px;color:var(--text-2);margin-top:6px">
          ✅ كل هذه السجلات ستنتقل معه للفصل الجديد
        </p>`;
    });

    Utils.on('smgmt-tr-btn', 'click', async () => {
      const name    = Utils.el('smgmt-tr-servant')?.value;
      const toClsId = Utils.el('smgmt-tr-cls')?.value;
      const err     = Utils.el('smgmt-tr-err');

      if (!name)    { if(err) err.textContent = '⚠️ اختار الخادم'; return; }
      if (!toClsId) { if(err) err.textContent = '⚠️ اختار الفصل'; return; }

      const fromCls = _allServants().find(s => s.name === name)?.classId;
      if (fromCls === toClsId) { if(err) err.textContent = '⚠️ الفصل نفسه'; return; }

      const btn = Utils.el('smgmt-tr-btn');
      btn.disabled    = true;
      btn.textContent = 'جارٍ النقل…';

      await _transferServant(name, fromCls, toClsId);
      UI.toast(`✅ تم نقل ${name} إلى ${_clsName(toClsId).replace('فصل ','')}`);
      _switchTab('list');
    });
  };

  // ══════════════════════════════════════════
  //  Firestore operations
  // ══════════════════════════════════════════

  // Save servant config override to Firestore
  // servant_config/{name} = { classId, deleted, updatedAt }
  const _saveServantConfig = async (name, classId, action) => {
    const ref = firebase.firestore().collection('servant_config').doc(name);
    if (action === 'delete') {
      await ref.set({ deleted: true, classId, updatedAt: new Date().toISOString() });
    } else {
      await ref.set({ deleted: false, classId, updatedAt: new Date().toISOString() });
    }
    // Reload config in memory
    await _reloadServantConfig();
  };

  const _deleteServant = async (name, clsId) => {
    if (!confirm(`حذف ${name} من ${_clsName(clsId).replace('فصل ','')}؟\nسجلاته هتفضل محفوظة.`)) return;
    await _saveServantConfig(name, clsId, 'delete');
    UI.toast(`تم حذف ${name}`);
    _renderList();
  };

  const _transferServant = async (name, fromClsId, toClsId) => {
    // Update all Firestore records for this servant to new classId
    const batch    = firebase.firestore().batch();
    const records  = State.get('records').filter(r => r.by === name || r.servantName === name);

    // Batch update classId in Firestore
    const snap = await firebase.firestore().collection('records')
      .where('by', '==', name).get();
    snap.forEach(doc => {
      batch.update(doc.ref, { classId: toClsId });
    });

    const snap2 = await firebase.firestore().collection('records')
      .where('servantName', '==', name).get();
    snap2.forEach(doc => {
      batch.update(doc.ref, { classId: toClsId });
    });

    await batch.commit();

    // Update servant_config
    await _saveServantConfig(name, toClsId, 'transfer');

    // Update local state records
    const updatedRecords = State.get('records').map(r => {
      if (r.by === name || r.servantName === name) return { ...r, classId: toClsId };
      return r;
    });
    State.setRecords(updatedRecords);
  };

  // ── Apply servant config overrides to CONFIG ──
  const _reloadServantConfig = async () => {
    try {
      const snap = await firebase.firestore().collection('servant_config').get();
      snap.forEach(doc => {
        const { classId, deleted } = doc.data();
        const name = doc.id;

        // Remove from all classes first
        CONFIG.classes.forEach(c => {
          c.servants = c.servants.filter(s => s !== name);
        });

        // If not deleted, add to target class
        if (!deleted) {
          const cls = CONFIG.classes.find(c => c.id === classId);
          if (cls && !cls.servants.includes(name)) {
            cls.servants.push(name);
          }
        }
      });

      // Refresh any active admin screen
      State.emit('configChanged');
    } catch(e) {
      console.warn('[ServantMgmt] reload failed:', e.message);
    }
  };

  // ── Init: load servant config overrides on app start ──
  const init = async () => {
    await _reloadServantConfig();
  };

  return { init, showModal };
})();
