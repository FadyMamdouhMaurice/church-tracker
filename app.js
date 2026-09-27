import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, onSnapshot, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, SHEET_ID, USERS } from "./firebase-config.js";
import { STUDENTS } from "./students.js";

// ── Init Firebase ──────────────────────────────────────────
const fbApp = initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);

// ── State ──────────────────────────────────────────────────
let currentUser = null;
let currentMode = "profile";
let currentStudentId = null;
let pendingNote = null;
let screenHistory = ["home-screen"];
let attState = {};
let cachedRecords = [];      // local cache for offline
let unsubscribe = null;

// ── Local Storage helpers ──────────────────────────────────
const LS = {
  get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ── Offline queue ──────────────────────────────────────────
function getQueue()       { return LS.get("offlineQueue", []); }
function addToQueue(rec)  { const q = getQueue(); q.push(rec); LS.set("offlineQueue", q); }
function clearQueue()     { LS.set("offlineQueue", []); }

async function flushQueue() {
  const q = getQueue();
  if (!q.length) return;
  let ok = 0;
  for (const rec of q) {
    try { await addDoc(collection(db, "records"), rec); ok++; } catch {}
  }
  if (ok === q.length) { clearQueue(); showToast(`✅ تمت مزامنة ${ok} سجل`); }
}

// ── Offline / Online events ────────────────────────────────
window.addEventListener("online",  async () => {
  document.getElementById("offline-bar").classList.remove("show");
  await flushQueue();
});
window.addEventListener("offline", () => {
  document.getElementById("offline-bar").classList.add("show");
});
if (!navigator.onLine) document.getElementById("offline-bar").classList.add("show");

// ── Real-time listener ─────────────────────────────────────
function startListener() {
  if (unsubscribe) unsubscribe();
  const q = query(collection(db, "records"), orderBy("date", "desc"));
  unsubscribe = onSnapshot(q, snap => {
    cachedRecords = snap.docs.map(d => ({ fsId: d.id, ...d.data() }));
    LS.set("cachedRecords", cachedRecords);
    updateHomeStats();
    document.getElementById("db-status").textContent =
      `🟢 متصل بـ Firebase — ${cachedRecords.length} سجل`;
  }, () => {
    cachedRecords = LS.get("cachedRecords", []);
    document.getElementById("db-status").textContent =
      `🔴 وضع غير متصل — ${cachedRecords.length} سجل محلي`;
  });
}

function getRecords() {
  const q = getQueue();
  return [...cachedRecords, ...q.map(r => ({ ...r, pending: true }))];
}

// ── Write record (Firebase + offline fallback) ─────────────
async function writeRecord(rec) {
  const full = { ...rec, by: currentUser.displayName, createdAt: new Date().toISOString() };
  if (navigator.onLine) {
    try {
      await addDoc(collection(db, "records"), { ...full, timestamp: serverTimestamp() });
      backupToSheets(full);   // non-blocking
      return true;
    } catch (e) { console.warn("Firestore write failed:", e); }
  }
  addToQueue(full);
  cachedRecords = [...cachedRecords, full];
  LS.set("cachedRecords", cachedRecords);
  return false;
}

// ── Google Sheets Backup (via public Apps Script) ──────────
// You need to deploy the Apps Script (see SETUP.md)
async function backupToSheets(rec) {
  const scriptUrl = LS.get("appsScriptUrl", "");
  if (!scriptUrl) return;
  try {
    await fetch(scriptUrl, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ sheetId: SHEET_ID, record: rec }),
      headers: { "Content-Type": "application/json" }
    });
  } catch {}
}

// ── LOGIN ──────────────────────────────────────────────────
window.doLogin = function () {
  const name = document.getElementById("login-name").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  const err  = document.getElementById("login-error");
  if (!name) { err.textContent = "اكتب اسمك"; return; }
  const user = USERS[pass];
  if (!user) { err.textContent = "كلمة المرور غير صحيحة"; return; }
  currentUser = { ...user, displayName: name };
  LS.set("currentUser", currentUser);
  err.textContent = "";
  initHome();
  goTo("home-screen");
  startListener();
};

window.doLogout = function () {
  if (unsubscribe) unsubscribe();
  currentUser = null;
  LS.set("currentUser", null);
  goTo("login-screen");
};

// ── NAVIGATION ─────────────────────────────────────────────
window.goTo = function (screen, mode) {
  if (mode) currentMode = mode;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(screen).classList.add("active");
  if (screen !== "login-screen") {
    if (screenHistory[screenHistory.length - 1] !== screen) screenHistory.push(screen);
    if (screen === "att-screen")      initAttendance();
    if (screen === "students-screen") initStudentsList();
    if (screen === "admin-screen")    initAdmin();
  }
  window.scrollTo(0, 0);
};

window.goBack = function () {
  screenHistory.pop();
  const prev = screenHistory[screenHistory.length - 1] || "home-screen";
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(prev).classList.add("active");
  window.scrollTo(0, 0);
};

// ── HOME ───────────────────────────────────────────────────
function initHome() {
  document.getElementById("servant-name-display").textContent = currentUser.displayName;
  document.getElementById("home-role").textContent  = currentUser.label;
  document.getElementById("current-week-label").textContent = getWeekLabel(getWeekKey());
  document.getElementById("admin-btn-wrap").style.display = currentUser.role === "admin" ? "" : "none";
  updateHomeStats();
}

function updateHomeStats() {
  const wk   = getWeekKey();
  const recs = getRecords();
  const attW = recs.filter(r => r.type === "attendance" && r.week === wk);
  const pres = attW.filter(r => r.present).length;
  const pct  = attW.length ? Math.round(pres / attW.length * 100) + "%" : "—";

  const fourAgo = new Date(); fourAgo.setDate(fourAgo.getDate() - 28);
  const visits  = recs.filter(r => r.type === "visit");
  const pending = STUDENTS.filter(s => {
    const sv = visits.filter(v => v.studentId === s.id);
    if (!sv.length) return true;
    return new Date(Math.max(...sv.map(v => new Date(v.date)))) < fourAgo;
  }).length;

  document.getElementById("home-stats").innerHTML = `
    <div class="stat-box"><div class="stat-num">${STUDENTS.length}</div><div class="stat-lbl">إجمالي الأولاد</div></div>
    <div class="stat-box"><div class="stat-num">${pct}</div><div class="stat-lbl">حضور هذا الأسبوع</div></div>
    <div class="stat-box"><div class="stat-num">${pending}</div><div class="stat-lbl">ينتظر افتقاد</div></div>
  `;
}

// ── STUDENTS LIST ──────────────────────────────────────────
let filteredStudents = [...STUDENTS];

function initStudentsList() {
  const labels = { call: "تسجيل مكالمة", visit: "تسجيل افتقاد", profile: "ملفات الأولاد" };
  document.getElementById("students-title").textContent = labels[currentMode] || "الأولاد";
  document.getElementById("search-input").value = "";
  filteredStudents = [...STUDENTS];
  renderStudentsList();
}

window.filterStudents = function () {
  const q = document.getElementById("search-input").value.trim();
  filteredStudents = q ? STUDENTS.filter(s => s.name.includes(q)) : [...STUDENTS];
  renderStudentsList();
};

function renderStudentsList() {
  const c    = document.getElementById("student-list-container");
  const wk   = getWeekKey();
  const recs = getRecords();

  if (!filteredStudents.length) {
    c.innerHTML = `<div class="empty-state"><div class="empty-emoji">🔍</div><p>لا توجد نتائج</p></div>`;
    return;
  }

  c.innerHTML = filteredStudents.map(s => {
    const att   = recs.find(r => r.type === "attendance" && r.week === wk && r.studentId === s.id);
    const lCall = recs.filter(r => r.type === "call"  && r.studentId === s.id).sort((a,b) => b.date.localeCompare(a.date))[0];
    const lVisit= recs.filter(r => r.type === "visit" && r.studentId === s.id).sort((a,b) => b.date.localeCompare(a.date))[0];
    const ad = att ? (att.present ? "g" : "r") : "x";
    const cd = lCall  && daysSince(lCall.date)  <= 7  ? "g" : "x";
    const vd = lVisit && daysSince(lVisit.date) <= 28 ? "g" : "x";
    return `<div class="student-card" onclick="openStudent(${s.id})">
      <div class="student-avatar">${s.name[0]}</div>
      <div class="student-info">
        <div class="s-name">${s.name}</div>
        <div class="s-meta">${s.address ? s.address.substring(0,48)+"…" : "لا يوجد عنوان"}</div>
      </div>
      <div class="s-dots">
        <div class="dot ${ad}" title="حضور"></div>
        <div class="dot ${cd}" title="مكالمة"></div>
        <div class="dot ${vd}" title="افتقاد"></div>
      </div>
    </div>`;
  }).join("");
}

// ── STUDENT PROFILE ────────────────────────────────────────
window.openStudent = function (id) {
  currentStudentId = id;
  if (currentMode === "call")  { quickLog("call", id); return; }
  if (currentMode === "visit") { openNoteModal("visit", id); return; }
  const s = STUDENTS.find(x => x.id === id);
  document.getElementById("profile-title").textContent = s.name.split(" ").slice(0, 2).join(" ");
  renderProfile(s);
  goTo("profile-screen");
};

function renderProfile(s) {
  const recs    = getRecords().filter(r => r.studentId === s.id).sort((a,b) => b.date.localeCompare(a.date));
  const urgent  = s.notes && s.notes.startsWith("⚠️");
  const phoneLabels = ["الولد", "الأم", "الأب", "إضافي"];

  document.getElementById("profile-content").innerHTML = `
    ${urgent ? `<div class="urgent-note">${s.notes}</div>` : ""}
    <div class="profile-header">
      <div class="profile-avatar">${s.name[0]}</div>
      <div class="profile-name">${s.name}</div>
    </div>
    <div class="action-btns">
      <div class="action-btn g" onclick="goTo('att-screen')"><span class="act-icon">📋</span>حضور</div>
      <div class="action-btn o" onclick="quickLog('call',${s.id})"><span class="act-icon">📞</span>مكالمة</div>
      <div class="action-btn p" onclick="openNoteModal('visit',${s.id})"><span class="act-icon">🏠</span>افتقاد</div>
    </div>
    <div class="info-card">
      <h3>📍 بيانات التواصل</h3>
      <div class="info-row"><span class="info-lbl">العنوان</span><span class="info-val">${s.address || "—"}</span></div>
      ${s.phones.map((p,i) => `<div class="info-row"><span class="info-lbl">${phoneLabels[i]||"رقم"}</span><span class="info-val"><a href="tel:${p}" class="phone-link">📱 ${p}</a></span></div>`).join("")}
    </div>
    ${s.notes && !urgent ? `<div class="info-card"><h3>📝 ملاحظات</h3><p style="font-size:13px;color:var(--text2);line-height:1.7">${s.notes}</p></div>` : ""}
    <div class="info-card">
      <h3>📊 سجل المتابعة</h3>
      ${recs.length === 0
        ? `<div class="empty-state" style="padding:20px"><div class="empty-emoji">📭</div><p>لا يوجد سجل بعد</p></div>`
        : recs.slice(0, 20).map(r => {
            const tl  = { attendance: r.present ? "✅ حضر" : "❌ غاب", call: "📞 مكالمة", visit: "🏠 افتقاد" }[r.type] || r.type;
            const bc  = { attendance: r.present ? "bg" : "br", call: "bo", visit: "bp" }[r.type] || "bg";
            return `<div class="hist-item">
              <div class="hist-date">${fmtDate(r.date)}</div>
              <div class="hist-body">
                <span class="badge ${bc}">${tl}</span>
                ${r.note ? `<div class="hist-note">${r.note}</div>` : ""}
                <div class="hist-by">بواسطة: ${r.by || "—"}</div>
              </div>
            </div>`;
          }).join("")
      }
    </div>
  `;
}

// ── QUICK LOG ──────────────────────────────────────────────
window.quickLog = async function (type, id) {
  const s = STUDENTS.find(x => x.id === id);
  await writeRecord({ type, studentId: id, date: today(), note: "" });
  showToast(`تم تسجيل ${type === "call" ? "المكالمة" : "الافتقاد"} لـ ${s.name.split(" ")[0]}`);
  if (currentMode === "call")    renderStudentsList();
  if (document.getElementById("profile-screen").classList.contains("active")) renderProfile(s);
};

// ── NOTE MODAL ─────────────────────────────────────────────
window.openNoteModal = function (type, id) {
  pendingNote = { type, id };
  const s = STUDENTS.find(x => x.id === id);
  document.getElementById("note-modal-title").textContent =
    (type === "visit" ? "افتقاد بيتي: " : "ملاحظة: ") + s.name.split(" ").slice(0, 2).join(" ");
  document.getElementById("note-text").value = "";
  document.getElementById("note-modal").classList.remove("hidden");
};

window.saveNote = async function () {
  if (!pendingNote) return;
  const note = document.getElementById("note-text").value.trim();
  const s    = STUDENTS.find(x => x.id === pendingNote.id);
  await writeRecord({ type: pendingNote.type, studentId: pendingNote.id, date: today(), note });
  showToast(`تم تسجيل ${pendingNote.type === "visit" ? "الافتقاد" : "الملاحظة"} لـ ${s.name.split(" ")[0]}`);
  closeModal();
  if (currentMode === "visit") renderStudentsList();
  if (document.getElementById("profile-screen").classList.contains("active")) renderProfile(s);
};

window.closeModal = function () {
  document.getElementById("note-modal").classList.add("hidden");
  pendingNote = null;
};

// ── ATTENDANCE ─────────────────────────────────────────────
function initAttendance() {
  buildWeekOptions(document.getElementById("att-week-select"));
  loadAttendance();
}

window.loadAttendance = function () {
  const wk   = document.getElementById("att-week-select").value;
  const recs = getRecords().filter(r => r.type === "attendance" && r.week === wk);
  attState = {};
  recs.forEach(r => { attState[r.studentId] = r.present; });
  renderAttList();
};

function renderAttList() {
  const pres  = Object.values(attState).filter(Boolean).length;
  const total = Object.keys(attState).length;
  document.getElementById("att-summary").textContent =
    total ? `تم تسجيل ${total} من 55 — حضر: ${pres} — غاب: ${total - pres}` : "لم يُسجَّل بعد";

  document.getElementById("att-list").innerHTML = STUDENTS.map(s => {
    const v = attState[s.id];
    return `<div class="att-row">
      <div class="student-avatar" style="width:34px;height:34px;font-size:13px">${s.name[0]}</div>
      <div class="att-name">${s.name.split(" ").slice(0, 3).join(" ")}</div>
      <div class="att-btns">
        <button class="att-btn p ${v === true  ? "sel" : ""}" onclick="setAtt(${s.id},true)">حضر</button>
        <button class="att-btn a ${v === false ? "sel" : ""}" onclick="setAtt(${s.id},false)">غاب</button>
      </div>
    </div>`;
  }).join("");
}

window.setAtt = function (id, present) { attState[id] = present; renderAttList(); };

window.saveAttendance = async function () {
  const wk  = document.getElementById("att-week-select").value;
  const ind = document.getElementById("att-saving");
  ind.textContent = "جارٍ الحفظ…";
  let n = 0;
  for (const [id, present] of Object.entries(attState)) {
    await writeRecord({ type: "attendance", week: wk, studentId: parseInt(id), present, date: wk });
    n++;
  }
  ind.textContent = "";
  showToast(`✅ تم حفظ حضور ${n} ولد`);
  updateHomeStats();
};

// ── ADMIN ──────────────────────────────────────────────────
function initAdmin() { adminTab("overview"); }

window.adminTab = function (tab) {
  document.querySelectorAll(".tab").forEach((t, i) => {
    t.classList.toggle("active", ["overview","att","followup"][i] === tab);
  });
  ["overview","att","followup"].forEach(t => {
    document.getElementById("admin-" + t).style.display = t === tab ? "" : "none";
  });
  if (tab === "overview") renderAdminOverview();
  if (tab === "att")      renderAdminAtt();
  if (tab === "followup") renderAdminFollowup();
};

function renderAdminOverview() {
  const recs = getRecords();
  const wk   = getWeekKey();
  const attW = recs.filter(r => r.type === "attendance" && r.week === wk);
  const pres = attW.filter(r => r.present).length;
  const pct  = attW.length ? Math.round(pres / attW.length * 100) : 0;
  const calls   = recs.filter(r => r.type === "visit"  && daysSince(r.date) <= 7).length;
  const visits  = recs.filter(r => r.type === "visit"  && daysSince(r.date) <= 28).length;
  const servants = [...new Set(recs.map(r => r.by).filter(Boolean))];

  document.getElementById("admin-overview").innerHTML = `
    <div class="big-stat">
      <div class="big-stat-num">${pct}%</div>
      <div class="big-stat-lbl">نسبة الحضور هذا الأسبوع — ${pres} من ${attW.length} مُسجَّل</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="stats-row" style="grid-template-columns:repeat(2,1fr)">
      <div class="stat-box"><div class="stat-num">${calls}</div><div class="stat-lbl">مكالمات هذا الأسبوع</div></div>
      <div class="stat-box"><div class="stat-num">${visits}</div><div class="stat-lbl">افتقاد هذا الشهر</div></div>
    </div>
    <div class="stats-row" style="grid-template-columns:repeat(2,1fr)">
      <div class="stat-box"><div class="stat-num">${servants.length}</div><div class="stat-lbl">خدام نشطين</div></div>
      <div class="stat-box"><div class="stat-num">${recs.length}</div><div class="stat-lbl">إجمالي السجلات</div></div>
    </div>
    <button class="export-btn" onclick="exportCSV()">⬇️ تصدير CSV</button>
  `;
}

function renderAdminAtt() {
  const weeks = Array.from({length:6}, (_,i) => getWeekKey(-i));
  const recs  = getRecords().filter(r => r.type === "attendance");
  const rows  = STUDENTS.map(s => {
    const data     = weeks.map(w => recs.find(x => x.studentId === s.id && x.week === w));
    const recorded = data.filter(Boolean).length;
    const present  = data.filter(d => d?.present).length;
    const pct      = recorded ? Math.round(present / recorded * 100) : null;
    return { s, data, pct };
  }).sort((a,b) => (a.pct ?? -1) - (b.pct ?? -1));

  document.getElementById("admin-att").innerHTML = `
    <div class="report-card"><div class="report-scroll">
    <table>
      <tr>
        <th>الاسم</th>
        ${weeks.slice(0,4).map(w => `<th>${w.slice(5)}</th>`).join("")}
        <th>%</th>
      </tr>
      ${rows.map(({s, data, pct}) => `
        <tr class="${pct !== null && pct < 50 ? "alert-tr" : ""}">
          <td style="cursor:pointer;color:var(--blue2);font-size:12px" onclick="openStudentAdmin(${s.id})">${s.name.split(" ").slice(0,2).join(" ")}</td>
          ${data.slice(0,4).map(d => `<td style="text-align:center">${d ? (d.present ? "✅":"❌") : "—"}</td>`).join("")}
          <td style="font-weight:700;color:${pct===null?"#999":pct<50?"var(--red)":pct<75?"var(--orange)":"var(--green)"}">${pct===null?"—":pct+"%"}</td>
        </tr>`).join("")}
    </table>
    </div></div>
    <p style="font-size:12px;color:var(--text2)">🔴 أقل من 50% حضور</p>
  `;
}

function renderAdminFollowup() {
  const recs = getRecords();
  const rows = STUDENTS.map(s => {
    const sv = recs.filter(r => r.type === "visit" && r.studentId === s.id);
    const sc = recs.filter(r => r.type === "call"  && r.studentId === s.id);
    const lv = sv.sort((a,b)=>b.date.localeCompare(a.date))[0];
    const lc = sc.sort((a,b)=>b.date.localeCompare(a.date))[0];
    return { s, vd: lv ? daysSince(lv.date) : 999, cd: lc ? daysSince(lc.date) : 999 };
  }).sort((a,b) => b.vd - a.vd);

  document.getElementById("admin-followup").innerHTML = `
    <div class="report-card"><div class="report-scroll">
    <table>
      <tr><th>الاسم</th><th>آخر افتقاد</th><th>آخر مكالمة</th></tr>
      ${rows.map(({s,vd,cd}) => `
        <tr class="${vd>28||cd>14?"alert-tr":""}">
          <td style="cursor:pointer;color:var(--blue2);font-size:12px" onclick="openStudentAdmin(${s.id})">${s.name.split(" ").slice(0,2).join(" ")}</td>
          <td style="color:${vd>28?"var(--red)":"var(--green)";font-size:12px}">${vd===999?"لم يُفتقد":vd+" يوم"}</td>
          <td style="color:${cd>14?"var(--red)":"var(--green)";font-size:12px}">${cd===999?"لم يُتصل":cd+" يوم"}</td>
        </tr>`).join("")}
    </table>
    </div></div>
    <p style="font-size:12px;color:var(--text2)">🔴 افتقاد +28 يوم أو مكالمة +14 يوم</p>
  `;
}

window.openStudentAdmin = function (id) {
  currentMode = "profile";
  const s = STUDENTS.find(x => x.id === id);
  document.getElementById("profile-title").textContent = s.name.split(" ").slice(0,2).join(" ");
  renderProfile(s);
  goTo("profile-screen");
};

// ── EXPORT CSV ─────────────────────────────────────────────
window.exportCSV = function () {
  const recs = getRecords();
  const rows = [["الاسم","النوع","التاريخ","الأسبوع","الحضور","بواسطة","ملاحظة"]];
  recs.forEach(r => {
    const s = STUDENTS.find(x => x.id === r.studentId);
    rows.push([s?.name||"",r.type,r.date,r.week||"",
      r.present===true?"حضر":r.present===false?"غاب":"",r.by||"",r.note||""]);
  });
  const csv  = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const a    = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"})),
    download: "church_tracker_" + today() + ".csv"
  });
  a.click();
};

// ── UTILS ──────────────────────────────────────────────────
function today()   { return new Date().toISOString().split("T")[0]; }
function daysSince(d) { return Math.floor((new Date() - new Date(d)) / 86400000); }
function getWeekKey(offset=0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 5 + offset * 7);
  return d.toISOString().split("T")[0];
}
function getWeekLabel(k) {
  return "أسبوع " + new Date(k).toLocaleDateString("ar-EG", {day:"numeric",month:"long",year:"numeric"});
}
function buildWeekOptions(sel, n=8) {
  sel.innerHTML = Array.from({length:n}, (_,i) => {
    const k = getWeekKey(-i);
    return `<option value="${k}"${i===0?" selected":""}>${getWeekLabel(k)}</option>`;
  }).join("");
}
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ar-EG", {day:"numeric",month:"short",year:"numeric"});
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById("sync-toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2800);
}

// ── BOOT ───────────────────────────────────────────────────
window.addEventListener("load", () => {
  const saved = LS.get("currentUser", null);
  if (saved?.displayName) {
    currentUser = saved;
    cachedRecords = LS.get("cachedRecords", []);
    initHome();
    goTo("home-screen");
    startListener();
  } else {
    goTo("login-screen");
  }
});
