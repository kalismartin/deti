'use client';

import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const MIN_INTERVAL_MS = 2 * 60 * 1000; // don't write more often than every 2 min…
const MIN_MOVE_M = 100; // …unless the kid moved at least this far

let watchId: number | null = null;
let lastWrite: { lat: number; lng: number; at: number } | null = null;

function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function writeLocation(uid: string, pos: GeolocationPosition) {
  const { latitude: lat, longitude: lng, accuracy } = pos.coords;
  await updateDoc(doc(db(), 'members', uid), {
    location: { lat, lng, accuracy: Math.round(accuracy), updatedAt: Date.now() },
  });
  lastWrite = { lat, lng, at: Date.now() };
}

/** One-shot check-in ("I'm here"). Returns a Czech error message or null. */
export async function checkIn(uid: string): Promise<string | null> {
  if (!('geolocation' in navigator)) return 'Tento prohlížeč neumí zjistit polohu.';
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await writeLocation(uid, pos);
          resolve(null);
        } catch {
          resolve('Uložení polohy selhalo.');
        }
      },
      (err) =>
        resolve(
          err.code === err.PERMISSION_DENIED
            ? 'Sdílení polohy není povoleno. Povol ho v nastavení prohlížeče.'
            : 'Polohu se nepodařilo zjistit.',
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

/** Keep updating location while the app is open (throttled). */
export function startSharing(uid: string): void {
  if (watchId !== null || !('geolocation' in navigator)) return;
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const now = Date.now();
      if (
        lastWrite &&
        now - lastWrite.at < MIN_INTERVAL_MS &&
        distanceM(lastWrite, { lat, lng }) < MIN_MOVE_M
      ) {
        return;
      }
      void writeLocation(uid, pos).catch(() => {});
    },
    () => {},
    { enableHighAccuracy: false, maximumAge: 60000 },
  );
}

export function stopSharing(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

export function sharingPreferred(): boolean {
  try {
    return localStorage.getItem('shareLocation') === '1';
  } catch {
    return false;
  }
}

export function setSharingPreferred(v: boolean): void {
  try {
    if (v) localStorage.setItem('shareLocation', '1');
    else localStorage.removeItem('shareLocation');
  } catch {
    /* ignore */
  }
}
