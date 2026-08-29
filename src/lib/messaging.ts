'use client';

import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db, VAPID_KEY } from './firebase';

let foregroundBound = false;

/**
 * Show pushes that arrive while the app is open and focused. Without this,
 * foreground FCM messages are delivered to the page and silently dropped —
 * the service worker only handles background messages.
 */
export async function listenForeground(): Promise<void> {
  if (foregroundBound || typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }
  if (Notification.permission !== 'granted') return;
  foregroundBound = true;
  const { getMessaging, onMessage } = await import('firebase/messaging');
  onMessage(getMessaging(), async (payload) => {
    const n = payload.notification ?? {};
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    await reg.showNotification(n.title ?? 'Děti', {
      body: n.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    });
  });
}

/** Get the current FCM token for this browser and store it on the member doc. */
async function registerToken(uid: string): Promise<string | null> {
  const { getMessaging, getToken } = await import('firebase/messaging');
  const registration = await navigator.serviceWorker.register(
    '/firebase-messaging-sw.js',
  );
  const token = await getToken(getMessaging(), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return 'Nepodařilo se získat token pro notifikace.';
  const prev = localStorage.getItem('fcmToken');
  if (prev && prev !== token) {
    // token rotated – drop the stale one from the member doc
    await updateDoc(doc(db(), 'members', uid), { fcmTokens: arrayRemove(prev) }).catch(
      () => {},
    );
  }
  await updateDoc(doc(db(), 'members', uid), { fcmTokens: arrayUnion(token) });
  localStorage.setItem('fcmToken', token);
  window.dispatchEvent(new Event('fcm-changed'));
  void listenForeground();
  return null;
}

/**
 * Ask for notification permission and register this browser's FCM token
 * on the member document. Returns an error message (Czech) or null on success.
 */
export async function enablePush(uid: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'Tento prohlížeč nepodporuje notifikace.';
  }
  if (!VAPID_KEY) {
    return 'Chybí VAPID klíč (NEXT_PUBLIC_FB_VAPID_KEY) – notifikace zatím nejsou nastavené.';
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return 'Notifikace nebyly povoleny.';
  }
  try {
    return await registerToken(uid);
  } catch (e) {
    console.error(e);
    return 'Registrace notifikací selhala.';
  }
}

/**
 * Silently re-register the token on app open when permission is already
 * granted and push was enabled on this device before. FCM tokens rotate;
 * without this a member stops receiving alerts until they re-enable manually.
 */
export async function refreshPushToken(uid: string): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window) || !VAPID_KEY) return;
  if (Notification.permission !== 'granted') return;
  if (!localStorage.getItem('fcmToken')) return;
  try {
    await registerToken(uid);
  } catch (e) {
    console.error(e);
  }
}

export async function disablePush(uid: string): Promise<void> {
  try {
    const token = localStorage.getItem('fcmToken');
    if (token) {
      await updateDoc(doc(db(), 'members', uid), { fcmTokens: arrayRemove(token) });
      localStorage.removeItem('fcmToken');
      window.dispatchEvent(new Event('fcm-changed'));
    }
  } catch (e) {
    console.error(e);
  }
}
