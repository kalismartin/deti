/* global importScripts, firebase */
// Firebase config is generated into firebase-config.js by scripts/gen-sw-config.mjs
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');
importScripts('/firebase-config.js');

firebase.initializeApp(self.FIREBASE_CONFIG);
// Instantiating messaging is all that's needed: the SDK auto-displays
// background messages carrying a notification payload and opens
// fcmOptions.link on click. A manual showNotification() here would show
// every notification twice.
firebase.messaging();
