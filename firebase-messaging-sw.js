// ─────────────────────────────────────────────
//  firebase-messaging-sw.js
//  Required at root for FCM background notifications
//  This file MUST be at /firebase-messaging-sw.js
// ─────────────────────────────────────────────

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyB54EsiRTzMI_zCKaEWUmzMT-CxoV_nzAY',
  authDomain:        'church-tracker-920f8.firebaseapp.com',
  projectId:         'church-tracker-920f8',
  storageBucket:     'church-tracker-920f8.firebasestorage.app',
  messagingSenderId: '569978915462',
  appId:             '1:569978915462:web:7071794f7b8137bc35df07',
});

const messaging = firebase.messaging();

// Handle background notifications (app closed or in background)
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, data } = payload.notification ?? payload.data ?? {};

  self.registration.showNotification(title ?? 'دفعة الأنبا موسى الأسود', {
    body:    body  ?? 'يوجد تحديث جديد',
    icon:    icon  ?? './icon.svg',
    badge:   './icon.svg',
    dir:     'rtl',
    lang:    'ar',
    tag:     data?.tag ?? 'church-tracker',
    data:    data ?? {},
    actions: data?.url ? [{ action: 'open', title: 'فتح' }] : [],
  });
});

// Click on notification → open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/church-tracker/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes('church-tracker') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
