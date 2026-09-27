// ── Firebase loaded via CDN scripts in index.html (compat mode) ──

// ── Config ────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyB54EsiRTzMI_zCKaEWUmzMT-CxoV_nzAY",
  authDomain: "church-tracker-920f8.firebaseapp.com",
  projectId: "church-tracker-920f8",
  storageBucket: "church-tracker-920f8.firebasestorage.app",
  messagingSenderId: "569978915462",
  appId: "1:569978915462:web:7071794f7b8137bc35df07"
};
const SHEET_ID = "1nChuW3S20fCre9fL7N935EbTfG7AvwQVlCvB4o06TTY";
const USERS = {
  'margirgis': { role: 'servant', label: 'خادم' },
  'admin2024': { role: 'admin',   label: 'أمين خدمة' }
};

// ── Students ──────────────────────────────────────────────────────
const STUDENTS = [
  {id:1,  name:"ادم ماهر عطالله فخري",            address:"35ش كابينه النور - صيدلية دكتور امجد",                                               phones:["01228391499","01115682928"],                        notes:"الاب مصاب بجلطة وشلل نصفى - ولا يحضر نهائى ويحتاج الى الافتقاد المستمر"},
  {id:2,  name:"ارساني هاني منير حبيب",            address:"الترعه التوفيقيه",                                                                  phones:["01228404631","01222291236"],                        notes:""},
  {id:3,  name:"اندرو ايهاب عطا وهيب",             address:"41 شارع الورشة - الراهبات - بجوار مدرسة طلائع المستقبل",                            phones:["01551714745","01228023686","01227096124"],           notes:"قريب دانيال ايهاب وهيلين جون - ملتزم"},
  {id:4,  name:"انطون جرجس عوض موسي",              address:"شارع على صبره - معرض ابو حشمت للموبيليا - بيت رقم 7 - الدور التالت",               phones:["01205536640","01202701469","01012670252"],           notes:"يحتاج للتواصل وسط مجموعة"},
  {id:5,  name:"باسل سمير حسنى",                   address:"18ش محمود شعراوي عزبة النخل - خلف مدرسة عمر مكرم - الدور الخامس",                  phones:["01288423171","01208793930","01210153304","01288680179"], notes:"ملتزم ويحتاج للتشجيع"},
  {id:6,  name:"بافلى رؤوف عبيد",                  address:"ش عطالله - بجوار كنيسة العذراء والبابا كيرلس - رقم البيت 18 - الدور الخامس",        phones:["01225800253","01224403611"],                        notes:"الولد عنده فرط حركة ومشكله في الكلام - يحتاج للافتقاد والتشجيع"},
  {id:7,  name:"بافلي بيتر مجدى ميلك",             address:"شارع أبو طالب من شارع 8 الخصوص بعد المدرسة بشارع",                                 phones:["01277978129"],                                     notes:""},
  {id:8,  name:"بولا رضا شحاته زكي",               address:"ش القنال على ناصيه قهوة ابو اشرف - الفريد",                                        phones:["01204543029","01225824078"],                        notes:"الرقم غلط"},
  {id:9,  name:"بولا ملاك صبرى يس",                address:"حارة هارون الرشيد متفرع من محمد فكرى - الشيخ منصور",                               phones:["01282727563","01285502046"],                        notes:""},
  {id:10, name:"بيتر ماجد صديق",                   address:"51ش هارون الرشيد متفرع من كابينة النور - اول بيت على اليمين - الدور الرابع",        phones:["01225319841","01274766140","01275787840"],           notes:"ملتزم / مخترع صغير"},
  {id:11, name:"بيشوى ناشد حربي",                  address:"شارع الفريد - شارع عطية حمودة - عند سوبر ماركت الامبراطور - الدور الخامس",          phones:["01010203180","01205514253"],                        notes:"بابا منفصل عن ماما - اخوة رب ويحتاج للمتابعة"},
  {id:12, name:"جورج فرح فرج جرجس",                address:"5ش ابو طه متفرع من مصطفي الشريف",                                                  phones:["01223069508","01225270573"],                        notes:""},
  {id:13, name:"جوفاني ملاك عطا",                  address:"35ش احمد حسن - الترعة التوفيقية - الدور التاسع",                                    phones:["01271338993","01271235899","01221125823"],           notes:"ملتزم / بيعرف يرسم"},
  {id:14, name:"جوفاني مينا بطرس",                 address:"38ش الشيخ منصور قبل جامع البني العربي الدور السادس",                               phones:["01274566805","01222866766","01222398765"],           notes:"شاطر جدا - الأنا قوية جدا والاحساس بالذات"},
  {id:15, name:"جوناثان يوسف حنا عبد السيد",       address:"28ش صبري المحامي - عند كنيسة ابو سيفين - الدور السادس والاخير",                    phones:["01289670991"],                                     notes:"شقى ويحتاج لعمل كنترول عليه"},
  {id:16, name:"دانيال ايهاب فليمون جيد",          address:"3ش عبد الرحمن السوداني - شارع البترول - تانى بيت على اليمين الدور الثانى",          phones:["01221155058","01284272484"],                        notes:"الولد فى المدرسة متأخر سنتين علشان اتأخر في التقديم"},
  {id:17, name:"دانيال مينا فهيم",                 address:"منطقة الزهور - 9 شارع عبد الخالق شريف - الدور الثالث",                             phones:["01229837552"],                                     notes:"بيت مستر ميشيل فهيم"},
  {id:18, name:"ديفيد سامح فوزى شرقاوى",           address:"63ش محمد فرغلي حسنين ارض الجنينه",                                                 phones:["01227545147","01205111267"],                        notes:""},
  {id:19, name:"رويس ماجد شحاته زكى",              address:"ش القنال على ناصيه قهوة ابو اشرف - الفريد",                                        phones:["01207131395","01227657294"],                        notes:"مغلق"},
  {id:20, name:"شنودة صلاح شكرى مسعد",             address:"ش عبد الخالق شريف من الفريد",                                                      phones:["01129681225","01146394199"],                        notes:""},
  {id:21, name:"شنودة مراد كحيل وهيب",             address:"ش محمد شمس متفرع من الفريد",                                                       phones:["01276378340","01225638961"],                        notes:"الرقم غلط"},
  {id:22, name:"فادى جورج وهيب لبيب",              address:"2ش عبد المنعم الشامي متفرع من الفريد",                                             phones:["01274998867","01289887359"],                        notes:""},
  {id:23, name:"فيلوباتير نبيل عطاالله",            address:"28ش عبد الخالق م الفريد امام كشرى زمزم",                                           phones:["01207474806","01271703131","01220349143"],           notes:""},
  {id:24, name:"كاراس اشرف طلعت زغلول",            address:"13ش غيط العنب",                                                                    phones:["01554297861","01559208886"],                        notes:""},
  {id:25, name:"كاراس اشرف مرزق",                  address:"شارع الزرايب العمومى بعد شارع الشعلة ب 3 شوارع",                                   phones:["01212449491","01203013761","01289596630"],           notes:"غير ملتزم نهائى - الام تعبانة وبتخاف عليهم"},
  {id:26, name:"كاراس بيشوى منير فيلبس",           address:"69ش عبد الخالق جمال عبد الناصر",                                                   phones:["01554614631"],                                     notes:""},
  {id:27, name:"كاراس جرجس وهيب حبيب",             address:"5شارع عبد العاطى محمد من الفريد بجوار صيدليه رافت",                                phones:["01277933921","01272023721"],                        notes:""},
  {id:28, name:"كاراس سامح بطرس شنودة",            address:"38شارع الشيخ منصور - الدور الثاني",                                                phones:["01154849808","01279610018","01065631660"],           notes:"ابن عم جوفاني"},
  {id:29, name:"كاراس عاطف نصيف",                  address:"1ش محمد عيد متفرع من شارع المعهد - الدور الخامس",                                  phones:["01277877183","01202441360","01202280703"],           notes:"ملتزم نسبيا - بيحب يحضر مع إعدادى"},
  {id:30, name:"كاراس عماد جرجس عزيز",             address:"1ش احمد رجب بعد الكوبري الجديد",                                                  phones:["01220136082","01211120724","01223411628"],           notes:""},
  {id:31, name:"كاراس فايز عبد عبدالله",           address:"4ش الفريد امام صيدليه رافت",                                                       phones:["01278373246","01221589478"],                        notes:""},
  {id:32, name:"كاراس فيصل سعد بيكليداس",          address:"4شارع الترعة التوفيقية امام الكوبرى الجديد",                                        phones:["01206387442","01203779858"],                        notes:""},
  {id:33, name:"كاراس مايكل",                      address:"37 شارع سيد نايل – ارض الجنينه – جنب سنترال ابانوب",                               phones:["01121378118","01272907771","01094455554"],           notes:"قريب كيرلس منصور"},
  {id:34, name:"كرياكوس ادوار حلمى عجايبى شنودى",  address:"ش احمد طه بجوار سوبر ماركت الملك",                                                phones:["01220355476","01225203811"],                        notes:""},
  {id:35, name:"كيرلس جرجس شحاته إبراهيم",         address:"1شارع ثابت توفيق من الفريد",                                                       phones:["01212308665","01212582477"],                        notes:""},
  {id:36, name:"كيرلس سامى فايق",                  address:"شارع كابينة النور الرئيسى - بيت رقم 21 - الدور الخامس",                            phones:["01289490912","01229552350","01276428587"],           notes:"⚠️ رجاء التواصل مع خدام الفصل السابقين: م/شيرين جورجى 01289619261 - م/كيرلس نشات 01221739256 — ضرورة قصوى"},
  {id:37, name:"كيرلس سلامة شحتة",                 address:"23شارع الكنيسة الفرنساوي",                                                         phones:["01212902256","01223156457"],                        notes:"اخوة رب قاعدين اغلب الوقت فى المطرية بسبب حادثة باباه"},
  {id:38, name:"كيرلس منصور رزق",                  address:"4شارع حموده عطيه متفرع من ش جمال عبد الناصر - الدور الاول",                        phones:["01212916269"],                                     notes:"⚠️ رجاء التواصل مع خدام الفصل السابقين: م/شيرين جورجى 01289619261 - م/كيرلس نشات 01221739256 — ضرورة قصوى"},
  {id:39, name:"مارتن مينا ظريف",                  address:"13شارع ثابت توفيق من الفريد ناصيه الشارع بتاع السجاد",                             phones:["01286931415","01286938885"],                        notes:""},
  {id:40, name:"مارك رومانى عزيز شحاته",           address:"23شارع أبو طه متفرع من الفريد (مول الكمبيوتر)",                                    phones:["01147491963","01125495198","01221803638"],           notes:""},
  {id:41, name:"مارك ماجد مكرم حنين",              address:"18شارع احمد حسين متفرع من الترعة التوفيقية",                                        phones:["01273869060"],                                     notes:"هادى وملتزم"},
  {id:42, name:"مارك محبوب فريز متياس",            address:"ش فايق يوسف عند صيدليه مرزوق",                                                    phones:["01212320421","01272086399"],                        notes:""},
  {id:43, name:"مارك نادي جمال انور",              address:"65ش فرغلي محمد حسنين متفرع من الفريد",                                             phones:["01200237334","01225599790"],                        notes:""},
  {id:44, name:"مارك يوسف وهبه اسكندر",            address:"1ش ابو طه من الشيخ منصور",                                                        phones:["01277195867","01225690960"],                        notes:""},
  {id:45, name:"ماركو داود فرج دوس",               address:"شارع غرب السكة العمارة اللي جنب الحايس",                                           phones:["01273264302","01280209043"],                        notes:""},
  {id:46, name:"مايكل تامر عريان",                 address:"1ش حسين عبد العزيز متفرع من الزرايب",                                             phones:["01556901713","01273468706","01287034966"],           notes:"غير ملتزم نسبيا - عنده معلومات وشاطر"},
  {id:47, name:"مقار هاني رمزي",                  address:"شارع اولاد نصار متفرع من ش جسر الخصوص – بيت رقم 21 - الدور الثانى",               phones:["01080499747","01033806051","01001324867"],           notes:"يحتاج للتشجيع والتوجيه - ملتزم نسبيا"},
  {id:48, name:"مكارى عادل عزت",                  address:"شارع البترول العمومى - بعد تقاطع شارع محمد فكرى - الدور الاول",                    phones:["01288351376","01225242749","01275155059"],           notes:"اخوة رب شقى - يحتاج للتوجيه - غير ملتزم نسبيا"},
  {id:49, name:"مكاريوس ميلاد نادى وديع",          address:"شارع الكنيسة الفرنساوى فوق سنترال بلال",                                           phones:["01279079138","01223740518"],                        notes:""},
  {id:50, name:"ميخائيل مكاريوس نجيب مرقص",        address:"عند الكوبرى بجوار اوكازيون ش الترعه التوفيقيه",                                   phones:["01203649558","01285162401"],                        notes:""},
  {id:51, name:"مينا رائد نصرى لمعى",              address:"ش طنطا م رشدى ماسك امتداد رشاد كشك",                                              phones:["01273490486","01270984504"],                        notes:""},
  {id:52, name:"مينا ملاك بخيت",                   address:"ش ثابت توفيقيه نجيب برغوت",                                                       phones:["01280168918","01276101909"],                        notes:""},
  {id:53, name:"يسي مايكل جميل",                   address:"جمال عبد الناصر - ناصية صيدلية مينا فارم",                                         phones:["01282082885"],                                     notes:"الولد شقي - كان في كنيسة تانية"},
  {id:54, name:"يوحنا مكرم",                       address:"28ش صبري المحامي - عند كنيسة ابو سيفين - الدور السادس",                            phones:["01206240103","01285144501","01281646330"],           notes:""},
  {id:55, name:"يوسف عادل يوسف عبدالله",           address:"22ش ابو كيله من الفريد",                                                           phones:["01281494841","01281157101","01220402641"],           notes:""}
];

// ── State ─────────────────────────────────────────────────────────
var currentUser = null;
var currentMode = "profile";
var currentStudentId = null;
var pendingNote = null;
var screenHistory = ["home-screen"];
var attState = {};
var cachedRecords = [];
var db = null;
var unsubscribe = null;

// ── LocalStorage helpers ──────────────────────────────────────────
function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {} }

// ── Offline queue ─────────────────────────────────────────────────
function getQueue()      { return lsGet("offlineQueue", []); }
function addToQueue(rec) { var q = getQueue(); q.push(rec); lsSet("offlineQueue", q); }
function clearQueue()    { lsSet("offlineQueue", []); }

function flushQueue() {
  var q = getQueue();
  if (!q.length || !db) return;
  var ok = 0;
  var total = q.length;
  q.forEach(function(rec) {
    db.collection("records").add(rec)
      .then(function() {
        ok++;
        if (ok === total) { clearQueue(); showToast("✅ تمت مزامنة " + ok + " سجل"); }
      }).catch(function() {});
  });
}

// ── Offline events ────────────────────────────────────────────────
window.addEventListener("online", function() {
  document.getElementById("offline-bar").classList.remove("show");
  flushQueue();
});
window.addEventListener("offline", function() {
  document.getElementById("offline-bar").classList.add("show");
});

// ── Firebase init + listener ──────────────────────────────────────
function initFirebase() {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
  startListener();
}

function startListener() {
  if (unsubscribe) unsubscribe();
  unsubscribe = db.collection("records")
    .orderBy("date", "desc")
    .onSnapshot(function(snap) {
      cachedRecords = snap.docs.map(function(d) { return Object.assign({ fsId: d.id }, d.data()); });
      lsSet("cachedRecords", cachedRecords);
      updateHomeStats();
      document.getElementById("db-status").textContent = "🟢 متصل بـ Firebase — " + cachedRecords.length + " سجل";
    }, function() {
      cachedRecords = lsGet("cachedRecords", []);
      document.getElementById("db-status").textContent = "🔴 وضع غير متصل — " + cachedRecords.length + " سجل محلي";
    });
}

function getRecords() {
  var pending = getQueue().map(function(r) { return Object.assign({ pending: true }, r); });
  return cachedRecords.concat(pending);
}

function writeRecord(rec) {
  var full = Object.assign({}, rec, { by: currentUser.displayName, createdAt: new Date().toISOString() });
  if (navigator.onLine && db) {
    return db.collection("records").add(full).catch(function() { addToQueue(full); });
  } else {
    addToQueue(full);
    cachedRecords = cachedRecords.concat([full]);
    lsSet("cachedRecords", cachedRecords);
    return Promise.resolve();
  }
}

// ── LOGIN ─────────────────────────────────────────────────────────
function doLogin() {
  var name = document.getElementById("login-name").value.trim();
  var pass = document.getElementById("login-pass").value.trim();
  var err  = document.getElementById("login-error");
  if (!name) { err.textContent = "اكتب اسمك"; return; }
  var user = USERS[pass];
  if (!user) { err.textContent = "كلمة المرور غير صحيحة"; return; }
  currentUser = Object.assign({}, user, { displayName: name });
  lsSet("currentUser", currentUser);
  err.textContent = "";
  initHome();
  goTo("home-screen");
}

function doLogout() {
  if (unsubscribe) unsubscribe();
  currentUser = null;
  lsSet("currentUser", null);
  goTo("login-screen");
}

// ── NAVIGATION ────────────────────────────────────────────────────
function goTo(screen, mode) {
  if (mode) currentMode = mode;
  document.querySelectorAll(".screen").forEach(function(s) { s.classList.remove("active"); });
  document.getElementById(screen).classList.add("active");
  if (screen !== "login-screen") {
    if (screenHistory[screenHistory.length - 1] !== screen) screenHistory.push(screen);
    if (screen === "att-screen")      initAttendance();
    if (screen === "students-screen") initStudentsList();
    if (screen === "admin-screen")    initAdmin();
  }
  window.scrollTo(0, 0);
}

function goBack() {
  screenHistory.pop();
  var prev = screenHistory[screenHistory.length - 1] || "home-screen";
  document.querySelectorAll(".screen").forEach(function(s) { s.classList.remove("active"); });
  document.getElementById(prev).classList.add("active");
  window.scrollTo(0, 0);
}

// ── HOME ──────────────────────────────────────────────────────────
function initHome() {
  document.getElementById("servant-name-display").textContent = currentUser.displayName;
  document.getElementById("home-role").textContent = currentUser.label;
  document.getElementById("current-week-label").textContent = getWeekLabel(getWeekKey());
  document.getElementById("admin-btn-wrap").style.display = currentUser.role === "admin" ? "" : "none";
  updateHomeStats();
}

function updateHomeStats() {
  var wk   = getWeekKey();
  var recs = getRecords();
  var attW = recs.filter(function(r) { return r.type === "attendance" && r.week === wk; });
  var pres = attW.filter(function(r) { return r.present; }).length;
  var pct  = attW.length ? Math.round(pres / attW.length * 100) + "%" : "—";
  var fourAgo = new Date(); fourAgo.setDate(fourAgo.getDate() - 28);
  var visits  = recs.filter(function(r) { return r.type === "visit"; });
  var pending = STUDENTS.filter(function(s) {
    var sv = visits.filter(function(v) { return v.studentId === s.id; });
    if (!sv.length) return true;
    return new Date(Math.max.apply(null, sv.map(function(v) { return new Date(v.date); }))) < fourAgo;
  }).length;
  document.getElementById("home-stats").innerHTML =
    '<div class="stat-box"><div class="stat-num">' + STUDENTS.length + '</div><div class="stat-lbl">إجمالي الأولاد</div></div>' +
    '<div class="stat-box"><div class="stat-num">' + pct + '</div><div class="stat-lbl">حضور هذا الأسبوع</div></div>' +
    '<div class="stat-box"><div class="stat-num">' + pending + '</div><div class="stat-lbl">ينتظر افتقاد</div></div>';
}

// ── STUDENTS LIST ─────────────────────────────────────────────────
var filteredStudents = STUDENTS.slice();

function initStudentsList() {
  var labels = { call: "تسجيل مكالمة", visit: "تسجيل افتقاد", profile: "ملفات الأولاد" };
  document.getElementById("students-title").textContent = labels[currentMode] || "الأولاد";
  document.getElementById("search-input").value = "";
  filteredStudents = STUDENTS.slice();
  renderStudentsList();
}

function filterStudents() {
  var q = document.getElementById("search-input").value.trim();
  filteredStudents = q ? STUDENTS.filter(function(s) { return s.name.indexOf(q) !== -1; }) : STUDENTS.slice();
  renderStudentsList();
}

function renderStudentsList() {
  var c    = document.getElementById("student-list-container");
  var wk   = getWeekKey();
  var recs = getRecords();
  if (!filteredStudents.length) {
    c.innerHTML = '<div class="empty-state"><div class="empty-emoji">🔍</div><p>لا توجد نتائج</p></div>';
    return;
  }
  c.innerHTML = filteredStudents.map(function(s) {
    var att    = recs.filter(function(r) { return r.type === "attendance" && r.week === wk && r.studentId === s.id; }).pop();
    var calls  = recs.filter(function(r) { return r.type === "call"  && r.studentId === s.id; }).sort(function(a,b){return b.date.localeCompare(a.date);});
    var visits = recs.filter(function(r) { return r.type === "visit" && r.studentId === s.id; }).sort(function(a,b){return b.date.localeCompare(a.date);});
    var ad = att ? (att.present ? "g" : "r") : "x";
    var cd = calls[0]  && daysSince(calls[0].date)  <= 7  ? "g" : "x";
    var vd = visits[0] && daysSince(visits[0].date) <= 28 ? "g" : "x";
    return '<div class="student-card" onclick="openStudent(' + s.id + ')">' +
      '<div class="student-avatar">' + s.name[0] + '</div>' +
      '<div class="student-info"><div class="s-name">' + s.name + '</div>' +
      '<div class="s-meta">' + (s.address ? s.address.substring(0,48) + "…" : "لا يوجد عنوان") + '</div></div>' +
      '<div class="s-dots"><div class="dot ' + ad + '"></div><div class="dot ' + cd + '"></div><div class="dot ' + vd + '"></div></div>' +
      '</div>';
  }).join("");
}

// ── PROFILE ───────────────────────────────────────────────────────
function openStudent(id) {
  currentStudentId = id;
  if (currentMode === "call")  { quickLog("call", id); return; }
  if (currentMode === "visit") { openNoteModal("visit", id); return; }
  var s = STUDENTS.filter(function(x) { return x.id === id; })[0];
  document.getElementById("profile-title").textContent = s.name.split(" ").slice(0,2).join(" ");
  renderProfile(s);
  goTo("profile-screen");
}

function renderProfile(s) {
  var recs   = getRecords().filter(function(r) { return r.studentId === s.id; })
                           .sort(function(a,b) { return b.date.localeCompare(a.date); });
  var urgent = s.notes && s.notes.indexOf("⚠️") === 0;
  var phoneLabels = ["الولد","الأم","الأب","إضافي"];
  var histHTML = recs.length === 0
    ? '<div class="empty-state" style="padding:20px"><div class="empty-emoji">📭</div><p>لا يوجد سجل بعد</p></div>'
    : recs.slice(0,20).map(function(r) {
        var tl = { attendance: r.present ? "✅ حضر" : "❌ غاب", call: "📞 مكالمة", visit: "🏠 افتقاد" }[r.type] || r.type;
        var bc = { attendance: r.present ? "bg" : "br", call: "bo", visit: "bp" }[r.type] || "bg";
        return '<div class="hist-item"><div class="hist-date">' + fmtDate(r.date) + '</div>' +
          '<div class="hist-body"><span class="badge ' + bc + '">' + tl + '</span>' +
          (r.note ? '<div class="hist-note">' + r.note + '</div>' : '') +
          '<div class="hist-by">بواسطة: ' + (r.by||"—") + '</div></div></div>';
      }).join("");

  document.getElementById("profile-content").innerHTML =
    (urgent ? '<div class="urgent-note">' + s.notes + '</div>' : '') +
    '<div class="profile-header"><div class="profile-avatar">' + s.name[0] + '</div>' +
    '<div class="profile-name">' + s.name + '</div></div>' +
    '<div class="action-btns">' +
    '<div class="action-btn g" onclick="goTo(\'att-screen\')"><span class="act-icon">📋</span>حضور</div>' +
    '<div class="action-btn o" onclick="quickLog(\'call\',' + s.id + ')"><span class="act-icon">📞</span>مكالمة</div>' +
    '<div class="action-btn p" onclick="openNoteModal(\'visit\',' + s.id + ')"><span class="act-icon">🏠</span>افتقاد</div></div>' +
    '<div class="info-card"><h3>📍 بيانات التواصل</h3>' +
    '<div class="info-row"><span class="info-lbl">العنوان</span><span class="info-val">' + (s.address||"—") + '</span></div>' +
    s.phones.map(function(p,i) {
      return '<div class="info-row"><span class="info-lbl">' + (phoneLabels[i]||"رقم") + '</span>' +
        '<span class="info-val"><a href="tel:' + p + '" class="phone-link">📱 ' + p + '</a></span></div>';
    }).join("") + '</div>' +
    (s.notes && !urgent ? '<div class="info-card"><h3>📝 ملاحظات</h3><p style="font-size:13px;color:var(--text2);line-height:1.7">' + s.notes + '</p></div>' : '') +
    '<div class="info-card"><h3>📊 سجل المتابعة</h3>' + histHTML + '</div>';
}

// ── QUICK LOG ─────────────────────────────────────────────────────
function quickLog(type, id) {
  var s = STUDENTS.filter(function(x) { return x.id === id; })[0];
  writeRecord({ type: type, studentId: id, date: today(), note: "" }).then(function() {
    showToast("تم تسجيل " + (type === "call" ? "المكالمة" : "الافتقاد") + " لـ " + s.name.split(" ")[0]);
    if (currentMode === "call") renderStudentsList();
    if (document.getElementById("profile-screen").classList.contains("active")) renderProfile(s);
  });
}

// ── NOTE MODAL ────────────────────────────────────────────────────
function openNoteModal(type, id) {
  pendingNote = { type: type, id: id };
  var s = STUDENTS.filter(function(x) { return x.id === id; })[0];
  document.getElementById("note-modal-title").textContent =
    (type === "visit" ? "افتقاد بيتي: " : "ملاحظة: ") + s.name.split(" ").slice(0,2).join(" ");
  document.getElementById("note-text").value = "";
  document.getElementById("note-modal").classList.remove("hidden");
}

function saveNote() {
  if (!pendingNote) return;
  var note = document.getElementById("note-text").value.trim();
  var s    = STUDENTS.filter(function(x) { return x.id === pendingNote.id; })[0];
  writeRecord({ type: pendingNote.type, studentId: pendingNote.id, date: today(), note: note }).then(function() {
    showToast("تم تسجيل " + (pendingNote.type === "visit" ? "الافتقاد" : "الملاحظة") + " لـ " + s.name.split(" ")[0]);
    closeModal();
    if (currentMode === "visit") renderStudentsList();
    if (document.getElementById("profile-screen").classList.contains("active")) renderProfile(s);
  });
}

function closeModal() {
  document.getElementById("note-modal").classList.add("hidden");
  pendingNote = null;
}

// ── ATTENDANCE ────────────────────────────────────────────────────
function initAttendance() {
  buildWeekOptions(document.getElementById("att-week-select"));
  loadAttendance();
}

function loadAttendance() {
  var wk   = document.getElementById("att-week-select").value;
  var recs = getRecords().filter(function(r) { return r.type === "attendance" && r.week === wk; });
  attState = {};
  recs.forEach(function(r) { attState[r.studentId] = r.present; });
  renderAttList();
}

function renderAttList() {
  var pres  = Object.values(attState).filter(Boolean).length;
  var total = Object.keys(attState).length;
  document.getElementById("att-summary").textContent =
    total ? "تم تسجيل " + total + " من 55 — حضر: " + pres + " — غاب: " + (total - pres) : "لم يُسجَّل بعد";
  document.getElementById("att-list").innerHTML = STUDENTS.map(function(s) {
    var v = attState[s.id];
    return '<div class="att-row">' +
      '<div class="student-avatar" style="width:34px;height:34px;font-size:13px">' + s.name[0] + '</div>' +
      '<div class="att-name">' + s.name.split(" ").slice(0,3).join(" ") + '</div>' +
      '<div class="att-btns">' +
      '<button class="att-btn p ' + (v === true  ? "sel" : "") + '" onclick="setAtt(' + s.id + ',true)">حضر</button>' +
      '<button class="att-btn a ' + (v === false ? "sel" : "") + '" onclick="setAtt(' + s.id + ',false)">غاب</button>' +
      '</div></div>';
  }).join("");
}

function setAtt(id, present) { attState[id] = present; renderAttList(); }

function saveAttendance() {
  var wk  = document.getElementById("att-week-select").value;
  var ind = document.getElementById("att-saving");
  var entries = Object.entries(attState);
  var n = 0;
  ind.textContent = "جارٍ الحفظ…";
  function next() {
    if (n >= entries.length) { ind.textContent = ""; showToast("✅ تم حفظ حضور " + n + " ولد"); updateHomeStats(); return; }
    var entry = entries[n++];
    writeRecord({ type: "attendance", week: wk, studentId: parseInt(entry[0]), present: entry[1], date: wk }).then(next);
  }
  next();
}

// ── ADMIN ─────────────────────────────────────────────────────────
function initAdmin() { adminTab("overview"); }

function adminTab(tab) {
  document.querySelectorAll(".tab").forEach(function(t, i) {
    t.classList.toggle("active", ["overview","att","followup"][i] === tab);
  });
  ["overview","att","followup"].forEach(function(t) {
    document.getElementById("admin-" + t).style.display = t === tab ? "" : "none";
  });
  if (tab === "overview") renderAdminOverview();
  if (tab === "att")      renderAdminAtt();
  if (tab === "followup") renderAdminFollowup();
}

function renderAdminOverview() {
  var recs = getRecords();
  var wk   = getWeekKey();
  var attW = recs.filter(function(r) { return r.type === "attendance" && r.week === wk; });
  var pres = attW.filter(function(r) { return r.present; }).length;
  var pct  = attW.length ? Math.round(pres / attW.length * 100) : 0;
  var calls   = recs.filter(function(r) { return r.type === "call"  && daysSince(r.date) <= 7; }).length;
  var visits  = recs.filter(function(r) { return r.type === "visit" && daysSince(r.date) <= 28; }).length;
  var servants = [];
  recs.forEach(function(r) { if (r.by && servants.indexOf(r.by) === -1) servants.push(r.by); });
  document.getElementById("admin-overview").innerHTML =
    '<div class="big-stat">' +
    '<div class="big-stat-num">' + pct + '%</div>' +
    '<div class="big-stat-lbl">نسبة الحضور هذا الأسبوع — ' + pres + ' من ' + attW.length + ' مُسجَّل</div>' +
    '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>' +
    '<div class="stats-row" style="grid-template-columns:repeat(2,1fr)">' +
    '<div class="stat-box"><div class="stat-num">' + calls  + '</div><div class="stat-lbl">مكالمات هذا الأسبوع</div></div>' +
    '<div class="stat-box"><div class="stat-num">' + visits + '</div><div class="stat-lbl">افتقاد هذا الشهر</div></div></div>' +
    '<div class="stats-row" style="grid-template-columns:repeat(2,1fr)">' +
    '<div class="stat-box"><div class="stat-num">' + servants.length + '</div><div class="stat-lbl">خدام نشطين</div></div>' +
    '<div class="stat-box"><div class="stat-num">' + recs.length + '</div><div class="stat-lbl">إجمالي السجلات</div></div></div>' +
    '<button class="export-btn" onclick="exportCSV()">⬇️ تصدير CSV</button>';
}

function renderAdminAtt() {
  var weeks = [];
  for (var i=0; i<6; i++) weeks.push(getWeekKey(-i));
  var recs  = getRecords().filter(function(r) { return r.type === "attendance"; });
  var rows  = STUDENTS.map(function(s) {
    var data     = weeks.map(function(w) { return recs.filter(function(x) { return x.studentId===s.id && x.week===w; }).pop(); });
    var recorded = data.filter(Boolean).length;
    var present  = data.filter(function(d) { return d && d.present; }).length;
    var pct      = recorded ? Math.round(present / recorded * 100) : null;
    return { s:s, data:data, pct:pct };
  }).sort(function(a,b) { return (a.pct===null?-1:a.pct) - (b.pct===null?-1:b.pct); });

  document.getElementById("admin-att").innerHTML =
    '<div class="report-card"><div class="report-scroll"><table>' +
    '<tr><th>الاسم</th>' + weeks.slice(0,4).map(function(w){return '<th>'+w.slice(5)+'</th>';}).join("") + '<th>%</th></tr>' +
    rows.map(function(row) {
      var c = row.pct===null?"#999":row.pct<50?"var(--red)":row.pct<75?"var(--orange)":"var(--green)";
      return '<tr class="' + (row.pct!==null&&row.pct<50?"alert-tr":"") + '">' +
        '<td style="cursor:pointer;color:var(--blue2);font-size:12px" onclick="openStudentAdmin(' + row.s.id + ')">' + row.s.name.split(" ").slice(0,2).join(" ") + '</td>' +
        row.data.slice(0,4).map(function(d){return '<td style="text-align:center">'+(d?(d.present?"✅":"❌"):"—")+'</td>';}).join("") +
        '<td style="font-weight:700;color:' + c + '">' + (row.pct===null?"—":row.pct+"%") + '</td></tr>';
    }).join("") +
    '</table></div></div><p style="font-size:12px;color:var(--text2)">🔴 أقل من 50% حضور</p>';
}

function renderAdminFollowup() {
  var recs = getRecords();
  var rows = STUDENTS.map(function(s) {
    var sv = recs.filter(function(r){return r.type==="visit"&&r.studentId===s.id;}).sort(function(a,b){return b.date.localeCompare(a.date);});
    var sc = recs.filter(function(r){return r.type==="call" &&r.studentId===s.id;}).sort(function(a,b){return b.date.localeCompare(a.date);});
    return { s:s, vd:sv[0]?daysSince(sv[0].date):999, cd:sc[0]?daysSince(sc[0].date):999 };
  }).sort(function(a,b){return b.vd-a.vd;});
  document.getElementById("admin-followup").innerHTML =
    '<div class="report-card"><div class="report-scroll"><table>' +
    '<tr><th>الاسم</th><th>آخر افتقاد</th><th>آخر مكالمة</th></tr>' +
    rows.map(function(row) {
      return '<tr class="' + (row.vd>28||row.cd>14?"alert-tr":"") + '">' +
        '<td style="cursor:pointer;color:var(--blue2);font-size:12px" onclick="openStudentAdmin(' + row.s.id + ')">' + row.s.name.split(" ").slice(0,2).join(" ") + '</td>' +
        '<td style="color:' + (row.vd>28?"var(--red)":"var(--green)") + ';font-size:12px">' + (row.vd===999?"لم يُفتقد":row.vd+" يوم") + '</td>' +
        '<td style="color:' + (row.cd>14?"var(--red)":"var(--green)") + ';font-size:12px">' + (row.cd===999?"لم يُتصل":row.cd+" يوم") + '</td></tr>';
    }).join("") +
    '</table></div></div><p style="font-size:12px;color:var(--text2)">🔴 افتقاد +28 يوم أو مكالمة +14 يوم</p>';
}

function openStudentAdmin(id) {
  currentMode = "profile";
  var s = STUDENTS.filter(function(x){return x.id===id;})[0];
  document.getElementById("profile-title").textContent = s.name.split(" ").slice(0,2).join(" ");
  renderProfile(s);
  goTo("profile-screen");
}

// ── EXPORT ────────────────────────────────────────────────────────
function exportCSV() {
  var recs = getRecords();
  var rows = [["الاسم","النوع","التاريخ","الأسبوع","الحضور","بواسطة","ملاحظة"]];
  recs.forEach(function(r) {
    var s = STUDENTS.filter(function(x){return x.id===r.studentId;})[0];
    rows.push([s?s.name:"",r.type,r.date,r.week||"",
      r.present===true?"حضر":r.present===false?"غاب":"",r.by||"",r.note||""]);
  });
  var csv = "\uFEFF" + rows.map(function(r){
    return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(",");
  }).join("\n");
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  a.download = "church_tracker_" + today() + ".csv";
  a.click();
}

// ── UTILS ─────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split("T")[0]; }
function daysSince(d) { return Math.floor((new Date() - new Date(d)) / 86400000); }
function getWeekKey(offset) {
  offset = offset || 0;
  var d = new Date();
  d.setDate(d.getDate() - d.getDay() + 5 + offset * 7);
  return d.toISOString().split("T")[0];
}
function getWeekLabel(k) {
  return "أسبوع " + new Date(k).toLocaleDateString("ar-EG",{day:"numeric",month:"long",year:"numeric"});
}
function buildWeekOptions(sel, n) {
  n = n || 8;
  sel.innerHTML = "";
  for (var i=0; i<n; i++) {
    var k = getWeekKey(-i);
    var o = document.createElement("option");
    o.value = k; o.textContent = getWeekLabel(k);
    if (i===0) o.selected = true;
    sel.appendChild(o);
  }
}
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ar-EG",{day:"numeric",month:"short",year:"numeric"});
}

var toastTimer;
function showToast(msg) {
  var t = document.getElementById("sync-toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.add("hidden"); }, 2800);
}

// ── BOOT ──────────────────────────────────────────────────────────
window.addEventListener("load", function() {
  if (!navigator.onLine) document.getElementById("offline-bar").classList.add("show");
  initFirebase();
  var saved = lsGet("currentUser", null);
  if (saved && saved.displayName) {
    currentUser = saved;
    cachedRecords = lsGet("cachedRecords", []);
    initHome();
    goTo("home-screen");
  }
});
