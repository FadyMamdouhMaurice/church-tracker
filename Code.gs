// ============================================================
//  Google Apps Script — كنيسة السيدة العذراء مريم عزبة النخل
//  Deploy as Web App: Execute as Me, Access: Anyone
// ============================================================

var SHEET_ID = "1nChuW3S20fCre9fL7N935EbTfG7AvwQVlCvB4o06TTY";

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "students";
  var result = action === "students" ? getStudents() : {error:"unknown action"};
  return buildResponse(result);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === "saveRecord") return buildResponse(saveRecord(body.record));
    return buildResponse({error:"unknown action"});
  } catch(err) {
    return buildResponse({error: err.message});
  }
}

// ── CORS response ─────────────────────────────────────────
function buildResponse(obj) {
  var output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ── GET students from all sheet tabs ─────────────────────
function getStudents() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheets = ss.getSheets();
    var classes = [], allStudents = [], studentId = 1;
    var skip = ["سجل الحضور","سجل المكالمات","سجل الافتقاد","إعدادات"];

    sheets.forEach(function(sheet) {
      var name = sheet.getName().trim();
      if (skip.indexOf(name) !== -1) return;

      var classId = nameToId(name);
      classes.push({id: classId, name: name});

      var data = sheet.getDataRange().getValues();
      if (data.length < 2) return;

      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var studentName = String(row[0] || "").trim();
        if (!studentName) continue;

        var phones = extractPhones([row[5], row[6], row[7]]);
        allStudents.push({
          id:      studentId++,
          cls:     classId,
          name:    studentName,
          address: String(row[4]  || "").trim().replace(/\n/g," "),
          phones:  phones,
          school:  String(row[8]  || "").trim().replace(/\n/g," "),
          notes:   String(row[13] || "").trim().replace(/\n/g," ")
        });
      }
    });

    return {classes: classes, students: allStudents};
  } catch(err) {
    return {error: err.message};
  }
}

// ── Save record to Sheet ──────────────────────────────────
function saveRecord(rec) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var names = {attendance:"سجل الحضور", call:"سجل المكالمات", visit:"سجل الافتقاد"};
    var sheetName = names[rec.type] || "سجل متنوع";
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var hdr = sheet.getRange(1,1,1,8);
      hdr.setValues([["التاريخ","اسم الولد","الفصل","النتيجة","بواسطة","ملاحظة","الأسبوع","وقت التسجيل"]]);
      hdr.setBackground("#1a3a6b").setFontColor("#ffffff").setFontWeight("bold");
      sheet.setFrozenRows(1);
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
    return {status:"saved"};
  } catch(err) {
    return {error: err.message};
  }
}

// ── Helpers ───────────────────────────────────────────────
function nameToId(name) {
  return name.trim().replace(/\s+/g,"_").replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g,"").substring(0,30);
}

function cleanPhone(p) {
  if (!p) return null;
  var s = String(p).trim();
  if (/^[\-_\u0640\s]+$/.test(s)) return null;
  try { var n=parseFloat(s); if(!isNaN(n)&&isFinite(n)) s=String(Math.round(n)); } catch(e){}
  var c = s.replace(/[^\d+]/g,"");
  if (!c || c.length < 8) return null;
  if (/^\d{10}$/.test(c) && c[0] !== "0") c = "0" + c;
  return c;
}

function extractPhones(cells) {
  var phones = [];
  cells.forEach(function(cell) {
    if (!cell) return;
    String(cell).split(/[\s\/\n,&]+/).forEach(function(part) {
      part = part.trim();
      if (!part || /[\u0600-\u06FF]/.test(part)) return;
      var p = cleanPhone(part);
      if (p && phones.indexOf(p) === -1) phones.push(p);
    });
  });
  return phones.slice(0,4);
}
