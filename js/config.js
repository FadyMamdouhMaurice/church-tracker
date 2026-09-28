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
    scriptUrl: 'https://script.google.com/macros/s/AKfycbyp-kXOCi44qG_DSiV29xOfYKnUYSHN8NrCoJzX8LO_a-Vgu3xGEbmX73tagh6-kVy0/exec',
    // Tabs to ignore when reading classes
    systemTabs: ['سجل الحضور', 'سجل المكالمات', 'سجل الافتقاد', 'إعدادات'],
  },

  auth: {
    adminPassword: 'admin2024',
    // Servants have no password — just name + class
  },

  cache: {
    students:  'ct_students',   // { classes, students, loadedAt }
    records:   'ct_records',    // array of record objects
    user:      'ct_user',       // current user object
    queue:     'ct_queue',      // offline write queue
  },

  followup: {
    visitWarningDays: 28,   // flag if no visit in this many days
    callWarningDays:  14,   // flag if no call in this many days
  },

  attendance: {
    weeksToShow: 8,
    weekStartDay: 5,  // Friday = 5
  },
};
