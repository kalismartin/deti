'use client';

import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY ?? 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN ?? 'demo-deti.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID ?? 'demo-deti',
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET ?? 'demo-deti.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID ?? '0',
  appId: process.env.NEXT_PUBLIC_FB_APP_ID ?? 'demo-app-id',
};

export const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === '1';
export const VAPID_KEY = process.env.NEXT_PUBLIC_FB_VAPID_KEY;

let app: FirebaseApp;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

function getApp(): FirebaseApp {
  if (!app) {
    app = getApps()[0] ?? initializeApp(firebaseConfig);
  }
  return app;
}

export function auth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getApp());
    if (USE_EMULATORS) {
      connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', {
        disableWarnings: true,
      });
    }
  }
  return authInstance;
}

export function db(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getApp());
    if (USE_EMULATORS) {
      connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
    }
  }
  return dbInstance;
}

export const googleProvider = new GoogleAuthProvider();
