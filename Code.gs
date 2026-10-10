// ─────────────────────────────────────────────
//  Code.gs — Google Apps Script
//  Deploy as Web App: Execute as Me, Anyone
// ─────────────────────────────────────────────
// @OnlyCurrentDoc — removed to allow Drive access

/**
 * @fileoverview Apps Script for Church Tracker
 * Requires: Spreadsheets + Drive
 */

var SHEET_ID   = '1nChuW3S20fCre9fL7N935EbTfG7AvwQVlCvB4o06TTY';
var SKIP_TABS  = ['سجل الحضور','سجل المكالمات','سجل الافتقاد','سجل متنوع','إعدادات'];

// ── Column indices (0-based) ──────────────────
// A=0  B=1(الفصل القديم)  C=2(الفصل الجديد)  D=3  E=4  F=5  G=6  H=7 ...
var COL = {
  name:       0,   // A — اسم الطفل
  oldClass:   1,   // B — الفصل القديم   (read-only)
  newClass:   2,   // C — الفصل الجديد  (read-only)
  birthday:   3,   // D — تاريخ الميلاد
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
  area:       14,  // O — المنطقة       ← NEW
  lordsBrethren: 15, // P — أخوة الرب  ← NEW
};

// Force Drive scope inclusion in OAuth
function _authDrive() {
  // This function is never called externally — it exists to ensure
  // Apps Script requests Drive permission during authorization
  DriveApp.getRootFolder();
}

// Handle CORS preflight
function doOptions(e) {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'students';
  var result = action === 'students' ? getStudents() : { error: 'unknown action' };
  return buildResponse(result);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action === 'saveRecord')    return buildResponse(saveRecord(body.record));
    if (body.action === 'updateStudent') return buildResponse(updateStudentRow(body.student));
    if (body.action === 'uploadPhoto')    return buildResponse(uploadPhoto(body));
    if (body.action === 'getPhoto')       return buildResponse(getStudentPhoto(body.studentId));
    if (body.action === 'transferStudent') return buildResponse(transferStudent(body));
    if (body.action === 'addStudent')      return buildResponse(addStudent(body));
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
        var r     = rows[i];
        var sName = String(r[COL.name] || '').trim();
        if (!sName) continue;

        students.push({
          id:        id++,
          cls:       (function() {
                       var nc = clean(r[COL.newClass]);
                       if (!nc) return classId;
                       // Normalize: add "فصل " prefix if missing
                       if (nc && nc.indexOf('فصل') !== 0) nc = 'فصل ' + nc;
                       var ncId = nameToId(nc);
                       return ncId !== classId ? ncId : classId;
                     })(),
          name:      sName,
          birthday:  cleanDate(r[COL.birthday]),
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
          area:         r.length > COL.area          ? clean(r[COL.area]) : '',
          lordsBrethren: r.length > COL.lordsBrethren ? (r[COL.lordsBrethren] === true || String(r[COL.lordsBrethren]).toUpperCase() === 'TRUE') : false,
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

// ── Update a student row in the Sheet ─────────
function updateStudentRow(s) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var cls   = s.cls ? s.cls.replace(/_/g, ' ') : '';
    var sheet = ss.getSheetByName(cls);
    if (!sheet) return { error: 'Sheet not found: ' + cls };

    var rows     = sheet.getDataRange().getValues();
    var rowIndex = -1;

    // Find row by matching student name (row 0 = header)
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][COL.name]).trim() === String(s.name).trim()) {
        rowIndex = i + 1; // 1-based for Sheets API
        break;
      }
    }

    if (rowIndex === -1) return { error: 'Student not found: ' + s.name };

    var phones = s.phones || {};

    // Update only editable columns (skip A/B/C/D which are name, old class, new class, birthday)
    sheet.getRange(rowIndex, COL.address    + 1).setValue(s.address    || '');
    sheet.getRange(rowIndex, COL.phoneChild + 1).setValue(phones.child || '');
    sheet.getRange(rowIndex, COL.phoneMom   + 1).setValue(phones.mom   || '');
    sheet.getRange(rowIndex, COL.phoneDad   + 1).setValue(phones.dad   || '');
    sheet.getRange(rowIndex, COL.school     + 1).setValue(s.school     || '');
    sheet.getRange(rowIndex, COL.jobDad     + 1).setValue(s.jobDad     || '');
    sheet.getRange(rowIndex, COL.jobMom     + 1).setValue(s.jobMom     || '');
    sheet.getRange(rowIndex, COL.deacon     + 1).setValue(s.deacon     ? 'TRUE' : 'FALSE');
    sheet.getRange(rowIndex, COL.confessor     + 1).setValue(s.confessor     || '');
    sheet.getRange(rowIndex, COL.notes         + 1).setValue(s.notes         || '');
    sheet.getRange(rowIndex, COL.area          + 1).setValue(s.area          || '');
    sheet.getRange(rowIndex, COL.lordsBrethren + 1).setValue(s.lordsBrethren ? 'TRUE' : 'FALSE');

    return { status: 'updated', row: rowIndex };
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

// Normalise birthday cell → 'YYYY-MM-DD' or ''
function cleanDate(v) {
  if (!v) return '';
  if (v instanceof Date && !isNaN(v)) {
    var y = v.getFullYear();
    var m = String(v.getMonth()+1).padStart(2,'0');
    var d = String(v.getDate()).padStart(2,'0');
    return y + '-' + m + '-' + d;
  }
  var s = String(v).trim();
  if (!s) return '';
  // DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY or DD\\MM\\YYYY
  var dmy = s.match(/^(\d{1,2})[\/\-\\](\d{1,2})[\/\-\\](\d{4})$/);
  if (dmy) return dmy[3] + '-' + dmy[2].padStart(2,'0') + '-' + dmy[1].padStart(2,'0');
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return '';
}

function extractPhone(cell) {
  if (!cell) return '';
  var s = String(cell).trim();
  if (/^[\-_\u0640\s\u0600-\u06FF]+$/.test(s)) return '';
  try { var n = parseFloat(s); if (!isNaN(n) && isFinite(n)) s = String(Math.round(n)); } catch(e){}
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

// ── Upload student photo to Drive ────────────
// Called via POST { action:'uploadPhoto', studentId, fileName, base64Data, mimeType }
// Returns { status:'saved', url, fileId }
function uploadPhoto(params) {
  try {
    var folderId = '11yEaxpNYPMd8Xl2A5LOLuXi-adJvV1Cu';
    var folder   = DriveApp.getFolderById(folderId);

    // Delete old photo for this student if exists
    var oldFiles = folder.getFilesByName('student_' + params.studentId + '.jpg');
    while (oldFiles.hasNext()) oldFiles.next().setTrashed(true);
    var oldFiles2 = folder.getFilesByName('student_' + params.studentId + '.png');
    while (oldFiles2.hasNext()) oldFiles2.next().setTrashed(true);
    var oldFiles3 = folder.getFilesByName('student_' + params.studentId + '.webp');
    while (oldFiles3.hasNext()) oldFiles3.next().setTrashed(true);

    // Decode base64 and save
    var ext      = (params.mimeType === 'image/png') ? '.png' : '.jpg';
    var fileName = 'student_' + params.studentId + ext;
    var blob     = Utilities.newBlob(
      Utilities.base64Decode(params.base64Data),
      params.mimeType,
      fileName
    );
    var file = folder.createFile(blob);

    // Make file publicly readable (so app can display it)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Return direct image URL (thumbnail format — works without auth)
    var fileId = file.getId();
    var url    = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w400';

    return { status: 'saved', url: url, fileId: fileId };
  } catch(err) {
    return { error: err.message };
  }
}

// ── Get photo URL for student ─────────────────
function getStudentPhoto(studentId) {
  try {
    var folderId = '11yEaxpNYPMd8Xl2A5LOLuXi-adJvV1Cu';
    var folder   = DriveApp.getFolderById(folderId);
    var exts     = ['.jpg', '.png', '.webp'];

    for (var i = 0; i < exts.length; i++) {
      var files = folder.getFilesByName('student_' + studentId + exts[i]);
      if (files.hasNext()) {
        var file = files.next();
        return {
          url:    'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w400',
          fileId: file.getId()
        };
      }
    }
    return { url: null };
  } catch(err) {
    return { error: err.message };
  }
}

// ── Transfer student to another class ────────
// Strategy: update column C (newClass) only — keeps studentId intact
// so ALL history (attendance, calls, visits) stays linked
// POST { action:'transferStudent', studentName, fromClass, toClass }
function transferStudent(params) {
  try {
    var ss        = SpreadsheetApp.openById(SHEET_ID);
    var fromSheet = ss.getSheetByName(params.fromClass);

    if (!fromSheet) return { error: 'الفصل القديم غير موجود: ' + params.fromClass };

    // Find student row in source sheet
    var rows     = fromSheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][COL.name]).trim() === String(params.studentName).trim()) {
        rowIndex = i + 1; // 1-based
        break;
      }
    }
    if (rowIndex === -1) return { error: 'المخدوم غير موجود: ' + params.studentName };

    // Only update column C (newClass) — studentId stays the same
    // The app reads newClass to determine which class the student belongs to
    fromSheet.getRange(rowIndex, COL.newClass + 1).setValue(params.toClass);

    return { status: 'transferred', from: params.fromClass, to: params.toClass };
  } catch(err) {
    return { error: err.message };
  }
}

// ── Add new student to a class ────────────────
// POST { action:'addStudent', student:{ name, cls, birthday, address, area,
//         phones:{child,mom,dad}, school, jobDad, jobMom, deacon,
//         lordsBrethren, confessor, notes } }
function addStudent(params) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var s     = params.student;
    var cls   = s.cls ? s.cls.replace(/_/g, ' ') : '';
    var sheet = ss.getSheetByName(cls);
    if (!sheet) return { error: 'الفصل غير موجود: ' + cls };

    // Build row matching COL indices
    // A  B(oldCls)  C(newCls)  D(bday)  E(addr)  F(phoneChild)  G(phoneMom)  H(phoneDad)
    // I(school)  J(jobDad)  K(jobMom)  L(deacon)  M(confessor)  N(notes)  O(area)  P(lordsBrethren)
    var row = new Array(16).fill('');
    row[COL.name]          = s.name        || '';
    row[COL.oldClass]      = cls;
    row[COL.newClass]      = cls;
    row[COL.birthday]      = s.birthday    || '';
    row[COL.address]       = s.address     || '';
    row[COL.phoneChild]    = (s.phones && s.phones.child) || '';
    row[COL.phoneMom]      = (s.phones && s.phones.mom)   || '';
    row[COL.phoneDad]      = (s.phones && s.phones.dad)   || '';
    row[COL.school]        = s.school      || '';
    row[COL.jobDad]        = s.jobDad      || '';
    row[COL.jobMom]        = s.jobMom      || '';
    row[COL.deacon]        = s.deacon      ? 'TRUE' : 'FALSE';
    row[COL.confessor]     = s.confessor   || '';
    row[COL.notes]         = s.notes       || '';
    row[COL.area]          = s.area        || '';
    row[COL.lordsBrethren] = s.lordsBrethren ? 'TRUE' : 'FALSE';

    sheet.appendRow(row);
    return { status: 'added', cls: cls };
  } catch(err) {
    return { error: err.message };
  }
}
