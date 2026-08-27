/* global importScripts, firebase */
// Firebase config is generated into firebase-config.js by scripts/gen-sw-config.mjs
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');
importScripts('/firebase-config.js');

firebase.initializeApp(self.FIREBASE_CONFIG);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification ?? {};
  self.registration.showNotification(n.title ?? 'Děti', {
    body: n.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
