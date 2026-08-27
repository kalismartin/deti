'use client';

import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { db, VAPID_KEY } from './firebase';

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
    const { getMessaging, getToken } = await import('firebase/messaging');
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
    );
    const token = await getToken(getMessaging(), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return 'Nepodařilo se získat token pro notifikace.';
    await updateDoc(doc(db(), 'members', uid), { fcmTokens: arrayUnion(token) });
    localStorage.setItem('fcmToken', token);
    return null;
  } catch (e) {
    console.error(e);
    return 'Registrace notifikací selhala.';
  }
}

export async function disablePush(uid: string): Promise<void> {
  try {
    const token = localStorage.getItem('fcmToken');
    if (token) {
      await updateDoc(doc(db(), 'members', uid), { fcmTokens: arrayRemove(token) });
      localStorage.removeItem('fcmToken');
    }
  } catch (e) {
    console.error(e);
  }
}
