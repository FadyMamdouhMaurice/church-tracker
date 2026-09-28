// ─────────────────────────────────────────────
//  js/notifications.js
//  Firebase Cloud Messaging — token management
//  + lesson upload + send notification
// ─────────────────────────────────────────────

const Notifications = (() => {
  let _messaging = null;
  let _token     = null;

  // ── Init (called from main.js after login) ──
  const init = async () => {
    if (!('Notification' in window)) return;
    if (!firebase?.messaging) return;

    try {
      _messaging = firebase.messaging();
    } catch (e) {
      console.warn('[FCM] messaging init failed:', e.message);
      return;
    }

    // If already granted, get token silently
    if (Notification.permission === 'granted') {
      await _getAndSaveToken();
    }
  };

  // ── Request permission (called on first login) ──
  const requestPermission = async () => {
    if (!_messaging) return false;
    if (Notification.permission === 'granted') {
      await _getAndSaveToken();
      return true;
    }
    if (Notification.permission === 'denied') return false;

    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        await _getAndSaveToken();
        return true;
      }
    } catch (e) {
      console.warn('[FCM] permission denied:', e);
    }
    return false;
  };

  // ── Get FCM token and save to Firestore ──
  const _getAndSaveToken = async () => {
    if (!_messaging) return;
    try {
      // Register FCM SW with explicit scope for GitHub Pages subpath
      let swReg;
      try {
        swReg = await navigator.serviceWorker.register(
          '/church-tracker/firebase-messaging-sw.js',
          { scope: '/church-tracker/' }
        );
      } catch(e) {
        // Fallback: use existing SW registration
        swReg = await navigator.serviceWorker.ready;
      }
      _token = await _messaging.getToken({
        vapidKey: CONFIG.fcm.vapidKey,
        serviceWorkerRegistration: swReg,
      });
      if (!_token) return;

      const user = State.get('user');
      if (!user) return;

      // Save token under fcm_tokens/{token}
      await firebase.firestore().collection('fcm_tokens').doc(_token).set({
        token:       _token,
        servantName: user.displayName ?? '',
        role:        user.role ?? 'servant',
        classId:     user.cls ?? '',
        updatedAt:   new Date().toISOString(),
      });

      console.log('[FCM] Token saved:', _token.slice(0, 20) + '…');
    } catch (e) {
      console.warn('[FCM] token error:', e.message);
    }
  };

  // ── Upload lesson (admin) ──────────────────
  // Saves lesson record to Firestore → triggers notification to all servants
  const uploadLesson = async ({ title, driveUrl, week, by }) => {
    const lessonRef = firebase.firestore().collection('lessons');

    // Check if lesson already exists for this week
    const existing = await lessonRef.where('week', '==', week).get();
    let docRef;

    if (!existing.empty) {
      // Update existing
      docRef = existing.docs[0].ref;
      await docRef.update({ title, driveUrl, by, updatedAt: new Date().toISOString() });
    } else {
      // New lesson
      docRef = await lessonRef.add({
        title,
        driveUrl,
        week,
        by,
        createdAt:  new Date().toISOString(),
        updatedAt:  new Date().toISOString(),
      });
    }

    // Send notification to all servants via Firestore trigger
    // We write a notification request that the Cloud Function will pick up
    await firebase.firestore().collection('notification_requests').add({
      type:      'lesson_uploaded',
      title:     `📖 درس جديد — ${Utils.weekLabel(week)}`,
      body:      `رفع ${by} درس هذا الأسبوع. اضغط لفتح الدرس.`,
      url:       driveUrl,
      week,
      by,
      createdAt: new Date().toISOString(),
      sent:      false,
    });

    return docRef.id;
  };

  // ── Get latest lesson for current week ────
  const getLatestLesson = async (week) => {
    try {
      const snap = await firebase.firestore()
        .collection('lessons')
        .where('week', '==', week)
        .limit(1)
        .get();
      if (snap.empty) return null;
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (e) {
      return null;
    }
  };

  // ── Listen for new lessons (servant side) ─
  const onNewLesson = (callback) => {
    return firebase.firestore()
      .collection('lessons')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .onSnapshot(snap => {
        if (!snap.empty) callback({ id: snap.docs[0].id, ...snap.docs[0].data() });
      });
  };

  return { init, requestPermission, uploadLesson, getLatestLesson, onNewLesson };
})();
