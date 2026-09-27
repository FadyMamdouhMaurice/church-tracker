# دليل رفع التطبيق على GitHub Pages

## الخطوات (15 دقيقة فقط)

---

### ١. إنشاء حساب GitHub (لو مش عندك)
- افتح github.com → Sign up
- أنشئ حساب مجاني

---

### ٢. رفع الملفات

**الطريقة الأسهل (بدون تثبيت أي برنامج):**

1. افتح github.com وسجل دخول
2. اضغط **+** (يمين فوق) → **New repository**
3. اسم الـ repo: `church-tracker`
4. اختار **Public**
5. اضغط **Create repository**
6. في الصفحة الجديدة اضغط **uploading an existing file**
7. **اسحب وأفلت** كل الملفات دي:
   - `index.html`
   - `style.css`
   - `app.js`
   - `firebase-config.js`
   - `students.js`
   - `manifest.json`
8. اضغط **Commit changes**

---

### ٣. تفعيل GitHub Pages

1. في الـ repo اضغط **Settings** (فوق)
2. من القائمة الجانبية: **Pages**
3. تحت Source: اختار **Deploy from a branch**
4. Branch: اختار **main** → **/root**
5. اضغط **Save**
6. انتظر دقيقتين → هيظهرلك الرابط:
   ```
   https://YOUR-USERNAME.github.io/church-tracker/
   ```

---

### ٤. تأمين Firebase (مهم!)

بعد ما التطبيق يشتغل، روح Firebase Console:

1. **Firestore → Rules** واستبدل الكود بـ:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /records/{doc} {
      allow read, write: if true;
    }
  }
}
```
> ده للبداية. بعدين ممكن نضيف authentication أقوى.

---

### ٥. ربط Google Sheets (للـ backup التلقائي)

#### أ) إنشاء Apps Script

1. افتح الـ Google Sheet بتاعك
2. من القائمة: **Extensions → Apps Script**
3. احذف الكود الموجود والصق ده:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const rec  = data.record;
    const ss   = SpreadsheetApp.openById(data.sheetId);

    const sheetName = rec.type === 'attendance' ? 'الحضور'
                    : rec.type === 'call'        ? 'المكالمات'
                    :                              'الافتقاد';

    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['التاريخ','اسم الولد','النوع','الحضور','بواسطة','ملاحظة','الأسبوع']);
    }

    const student = rec.studentId;
    sheet.appendRow([
      rec.date,
      rec.studentId,
      rec.type,
      rec.present === true ? 'حضر' : rec.present === false ? 'غاب' : '',
      rec.by || '',
      rec.note || '',
      rec.week || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({status:'ok'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({status:'error', msg: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

4. اضغط **Deploy → New deployment**
5. Type: **Web app**
6. Execute as: **Me**
7. Who has access: **Anyone**
8. اضغط **Deploy** → انسخ الـ URL

#### ب) إضافة الـ URL للتطبيق

افتح التطبيق من موبايلك → في أي شاشة افتح الـ Console أو:
- افتح `app.js` وفي الأعلى غير السطر ده:
```javascript
const scriptUrl = LS.get("appsScriptUrl", "");
```
إلى:
```javascript
const scriptUrl = LS.get("appsScriptUrl", "YOUR_APPS_SCRIPT_URL_HERE");
```

---

### ٦. بعد كل ده

شارك الرابط مع الخدام:
```
https://YOUR-USERNAME.github.io/church-tracker/
```

كل خادم يحفظه على موبايله زي أي موقع عادي.

---

## كلمات المرور

| الدور | كلمة المرور |
|-------|-------------|
| خادم الفصل | `margirgis` |
| أمين الخدمة | `admin2024` |

لتغيير كلمات المرور: عدّل ملف `firebase-config.js`

---

## دعم تقني

لو في مشكلة، ابعث screenshot للخطأ.
