// ============================================================
//  Google Apps Script — كنيسة السيدة العذراء مريم عزبة النخل
//  Deploy as Web App: Execute as Me, Access: Anyone
// ============================================================

var SHEET_ID = "1nChuW3S20fCre9fL7N935EbTfG7AvwQVlCvB4o06TTY";
var ADMIN_PASS = "admin2024";

// ── GET: جلب بيانات الأولاد من كل الـ tabs ──────────────────
function doGet(e) {
  var action = e.parameter.action || "students";

  if (action === "students") {
    return getStudents();
  }
  if (action === "ping") {
    return jsonResponse({ status: "ok", time: new Date().toISOString() });
  }
  return jsonResponse({ error: "unknown action" });
}

function getStudents() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheets = ss.getSheets();
    var classes = [];
    var allStudents = [];
    var studentId = 1;

    sheets.forEach(function(sheet) {
      var name = sheet.getName();
      // تجاهل شيتات النظام
      if (name === "سجل الحضور" || name === "سجل المكالمات" || name === "سجل الافتقاد" || name === "إعدادات") return;

      var classId = nameToId(name);
      classes.push({ id: classId, name: name });

      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return;

      // الصف الأول هو الـ headers — نبدأ من الصف الثاني
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var studentName = String(row[0] || "").trim();
        if (!studentName) continue;

        var phones = extractPhones([row[5], row[6], row[7]]);
        var address = String(row[4] || "").trim().replace(/\n/g, " ");
        var notes   = String(row[13] || "").trim().replace(/\n/g, " ");

        allStudents.push({
          id:      studentId++,
          cls:     classId,
          name:    studentName,
          address: address,
          phones:  phones,
          dob:     String(row[3] || "").trim(),
          school:  String(row[8]  || "").trim(),
          notes:   notes
        });
      }
    });

    return jsonResponse({ classes: classes, students: allStudents });
  } catch(err) {
    return jsonResponse({ error: err.message });
  }
}

// ── POST: حفظ سجل (حضور / مكالمة / افتقاد) ────────────────
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.action === "saveRecord") {
      return saveRecord(body.record);
    }
    return jsonResponse({ error: "unknown action" });
  } catch(err) {
    return jsonResponse({ error: err.message });
  }
}

function saveRecord(rec) {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  var sheetName = {
    attendance: "سجل الحضور",
    call:       "سجل المكالمات",
    visit:      "سجل الافتقاد"
  }[rec.type] || "سجل متنوع";

  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["التاريخ", "اسم الولد", "الفصل", "الحضور/النتيجة", "بواسطة", "ملاحظة", "الأسبوع", "وقت التسجيل"]);
    sheet.setFrozenRows(1);
    // تنسيق الـ header
    sheet.getRange(1, 1, 1, 8).setBackground("#1a3a6b").setFontColor("#ffffff").setFontWeight("bold");
  }

  sheet.appendRow([
    rec.date        || "",
    rec.studentName || "",
    rec.className   || "",
    rec.type === "attendance" ? (rec.present ? "حضر" : "غاب") : "تم",
    rec.by          || "",
    rec.note        || "",
    rec.week        || "",
    new Date().toLocaleString("ar-EG")
  ]);

  return jsonResponse({ status: "saved" });
}

// ── Helpers ──────────────────────────────────────────────────
function nameToId(name) {
  return name.trim()
    .replace(/\s+/g, "_")
    .replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g, "")
    .substring(0, 30);
}

function cleanPhone(p) {
  if (!p) return null;
  var s = String(p).trim();
  if (/^[\-_\u0640\s]+$/.test(s)) return null;
  // scientific notation
  try {
    var n = parseFloat(s);
    if (!isNaN(n) && isFinite(n)) s = String(Math.round(n));
  } catch(e) {}
  var cleaned = s.replace(/[^\d+]/g, "");
  if (!cleaned || cleaned.length < 8) return null;
  if (/^\d{10}$/.test(cleaned) && cleaned[0] !== "0") cleaned = "0" + cleaned;
  return cleaned;
}

function extractPhones(cells) {
  var phones = [];
  cells.forEach(function(cell) {
    if (!cell) return;
    var text = String(cell).trim();
    var parts = text.split(/[\s\/\n,&]+/);
    parts.forEach(function(part) {
      part = part.trim();
      if (!part || /[\u0600-\u06FF]/.test(part)) return;
      var p = cleanPhone(part);
      if (p && phones.indexOf(p) === -1) phones.push(p);
    });
  });
  return phones.slice(0, 4);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
