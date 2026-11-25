/* 소담 알림 · 백그라운드 알림. 알림을 누르면 BASE CAMP를 열어요 */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
importScripts('config.js');
var C = self.SODAM_CFG;
firebase.initializeApp(C.firebase);
firebase.messaging();
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var link = (e.notification.data && (e.notification.data.link || (e.notification.data.FCM_MSG && e.notification.data.FCM_MSG.fcmOptions && e.notification.data.FCM_MSG.fcmOptions.link))) || C.baseCamp;
  e.waitUntil(clients.openWindow(link));
});
