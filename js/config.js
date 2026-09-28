// ─────────────────────────────────────────────
//  config.js  —  All app-wide constants
// ─────────────────────────────────────────────

const CONFIG = {
  church: {
    name:     'كنيسة السيدة العذراء مريم',
    location: 'عزبة النخل',
    batch:    'دفعة الأنبا موسى الأسود — إعدادي',
  },

  firebase: {
    apiKey:            'AIzaSyB54EsiRTzMI_zCKaEWUmzMT-CxoV_nzAY',
    authDomain:        'church-tracker-920f8.firebaseapp.com',
    projectId:         'church-tracker-920f8',
    storageBucket:     'church-tracker-920f8.firebasestorage.app',
    messagingSenderId: '569978915462',
    appId:             '1:569978915462:web:7071794f7b8137bc35df07',
  },

  sheets: {
    id:        '1nChuW3S20fCre9fL7N935EbTfG7AvwQVlCvB4o06TTY',
    scriptUrl: 'https://script.google.com/macros/s/AKfycbys1Kx4fjlnUgoXT5O1730WCpAPwNRGr05fpoPUma8MGfjZOeQCDL4uzhDXAa0EOOk3/exec',
    systemTabs: ['سجل الحضور', 'سجل المكالمات', 'سجل الافتقاد', 'إعدادات'],
  },

  // ── Servants per class ───────────────────────
  // classId must match the Sheet tab name (after nameToId conversion)
  classes: [
    {
      id:       'فصل_الشهيد_مارمينا',
      name:     'فصل الشهيد مارمينا',
      subtitle: 'القديس باجوش و بولس الرسول',
      servants: ['ماريو ميشيل', 'فادي اشرف', 'شنودة', 'جون عزت', 'مينا مجدي'],
    },
    {
      id:       'فصل_الشهيد_ابو_سيفين',
      name:     'فصل الشهيد ابو سيفين',
      subtitle: 'الانبا انطونيوس و الانبا كاراس',
      servants: ['م / عزيز', 'فيلو اكرم', 'رياض', 'جورج ثروت', 'تيفا'],
    },
    {
      id:       'فصل_الامير_تادرس_الشطبي',
      name:     'فصل الامير تادرس الشطبي',
      subtitle: 'العذراء و ابونا فلتاؤس',
      servants: ['اندروا ادوار', 'مينا شريف', 'جون جابر', 'بولا طارق', 'اندروا سامي'],
    },
    {
      id:       'فصل_الشهيد_لونجينوس_القائد',
      name:     'فصل الشهيد لونجينوس القائد',
      subtitle: 'البابا ديسقوروس و الانبا رويس',
      servants: ['عزام', 'رامي', 'مينا ثروت', 'بيشوي ممدوح', 'م / فكري'],
    },
    {
      id:       'فصل_الشهيد_مارجرجس',
      name:     'فصل الشهيد مارجرجس',
      subtitle: 'مارجرجس و الشهيدة دميانة',
      servants: ['ماهر', 'توماس وديع', 'اندروا عادل', 'فادي ممدوح', 'كيرلس ابراهيم', 'مرقس'],
    },
  ],

  // ── Admins (أمناء الخدمة) ────────────────────
  admins: {
    password: 'Mousa2026',
    names: ['ماريو جرجس', 'فيلوباتير وحيد', 'ريموند حكيم'],
  },

  cache: {
    students: 'ct_students',
    records:  'ct_records',
    user:     'ct_user',
    queue:    'ct_queue',
  },

  followup: {
    visitWarningDays: 28,
    callWarningDays:  14,
  },

  attendance: {
    weeksToShow:  8,
    weekStartDay: 5, // Friday = 5
  },

  mass: {
    weeksToShow: 8,
  },

  drive: {
    lessonFolderId: '1X76h60p5TBaZ04BtAcWPC3gsZ832KiT5',
    lessonFolderUrl: 'https://drive.google.com/drive/folders/1X76h60p5TBaZ04BtAcWPC3gsZ832KiT5',
  },
};
