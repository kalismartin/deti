// Generates public/firebase-config.js for the messaging service worker
// from NEXT_PUBLIC_FB_* env vars (loaded from .env.local / .env if present).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const file of ['.env', '.env.local']) {
  const p = join(root, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const config = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY ?? 'demo-api-key',
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN ?? 'demo-deti.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID ?? 'demo-deti',
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET ?? 'demo-deti.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID ?? '0',
  appId: process.env.NEXT_PUBLIC_FB_APP_ID ?? 'demo-app-id',
};

writeFileSync(
  join(root, 'public', 'firebase-config.js'),
  `self.FIREBASE_CONFIG = ${JSON.stringify(config, null, 2)};\n`,
);
console.log('public/firebase-config.js generated');
