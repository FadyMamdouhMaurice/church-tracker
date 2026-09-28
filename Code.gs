// ─────────────────────────────────────────────
//  Code.gs — Google Apps Script
//  Deploy as Web App: Execute as Me, Anyone
// ─────────────────────────────────────────────

var SHEET_ID   = '1nChuW3S20fCre9fL7N935EbTfG7AvwQVlCvB4o06TTY';
var SKIP_TABS  = ['سجل الحضور','سجل المكالمات','سجل الافتقاد','إعدادات'];

// ── Column indices (0-based) ──────────────────
var COL = {
  name:       0,   // A — اسم الطفل
  address:    4,   // E — العنوان
  phoneChild: 5,   // F — تليفون المخدوم
  phoneMom:   6,   // G — تليفون الأم
  phoneDad:   7,   // H — تليفون الأب
  school:     8,   // I — المدرسة
  jobDad:     9,   // J — وظيفة الأب
  jobMom:     10,  // K — وظيفة الأم
  deacon:     11,  // L — الشمامسة
  confessor:  12,  // M — أب الاعتراف
  notes:      13,  // N — ملاحظات
};

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'students';
  var result = action === 'students' ? getStudents() : { error: 'unknown action' };
  return buildResponse(result);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'saveRecord') return buildResponse(saveRecord(body.record));
    return buildResponse({ error: 'unknown action' });
  } catch(err) {
    return buildResponse({ error: err.message });
  }
}

function getStudents() {
  try {
    var ss      = SpreadsheetApp.openById(SHEET_ID);
    var sheets  = ss.getSheets();
    var classes = [], students = [], id = 1;

    sheets.forEach(function(sheet) {
      var name = sheet.getName().trim();
      if (SKIP_TABS.indexOf(name) !== -1) return;

      var classId = nameToId(name);
      classes.push({ id: classId, name: name });

      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        var r    = rows[i];
        var sName = String(r[COL.name] || '').trim();
        if (!sName) continue;

        students.push({
          id:        id++,
          cls:       classId,
          name:      sName,
          address:   clean(r[COL.address]),
          phones: {
            child:   extractPhone(r[COL.phoneChild]),
            mom:     extractPhone(r[COL.phoneMom]),
            dad:     extractPhone(r[COL.phoneDad]),
          },
          school:    clean(r[COL.school]),
          jobDad:    clean(r[COL.jobDad]),
          jobMom:    clean(r[COL.jobMom]),
          deacon:    r[COL.deacon] === true || String(r[COL.deacon]).toUpperCase() === 'TRUE',
          confessor: clean(r[COL.confessor]),
          notes:     clean(r[COL.notes]),
        });
      }
    });

    return { classes: classes, students: students };
  } catch(err) {
    return { error: err.message };
  }
}

function saveRecord(rec) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheetNames = { attendance: 'سجل الحضور', call: 'سجل المكالمات', visit: 'سجل الافتقاد' };
    var sheetName  = sheetNames[rec.type] || 'سجل متنوع';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      var hdr = sheet.getRange(1, 1, 1, 8);
      hdr.setValues([['التاريخ','اسم الولد','الفصل','النتيجة','بواسطة','ملاحظة','الأسبوع','وقت التسجيل']]);
      hdr.setBackground('#1a3a6b').setFontColor('#ffffff').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      rec.date        || '',
      rec.studentName || '',
      rec.className   || '',
      rec.type === 'attendance' ? (rec.present ? 'حضر' : 'غاب') : 'تم',
      rec.by          || '',
      rec.note        || '',
      rec.week        || '',
      new Date().toLocaleString('ar-EG'),
    ]);
    return { status: 'saved' };
  } catch(err) {
    return { error: err.message };
  }
}

// ── Helpers ───────────────────────────────────
function nameToId(n) {
  return n.trim().replace(/\s+/g,'_').replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g,'').substring(0,40);
}

function clean(v) {
  if (!v) return '';
  return String(v).trim().replace(/\n/g,' ');
}

function extractPhone(cell) {
  if (!cell) return '';
  var s = String(cell).trim();
  if (/^[\-_\u0640\s\u0600-\u06FF]+$/.test(s)) return ''; // dashes or Arabic only
  try { var n = parseFloat(s); if (!isNaN(n) && isFinite(n)) s = String(Math.round(n)); } catch(e){}
  // Take first phone-like sequence
  var match = s.match(/0[1-9]\d{8,9}/);
  if (match) return match[0];
  var c = s.replace(/[^\d]/g,'');
  if (c.length >= 10) {
    if (c.length === 10 && c[0] !== '0') c = '0' + c;
    return c.substring(0, 11);
  }
  return '';
}

function buildResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
