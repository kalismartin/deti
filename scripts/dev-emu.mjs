// Cross-platform equivalent of: NEXT_PUBLIC_USE_EMULATORS=1 npm run dev
//
// Forces the demo project config so the emulator namespace stays `demo-deti`
// even when .env.local carries the production (deti-mk) config — the Firestore
// and Auth emulators namespace all data by project id.
import { spawn } from 'node:child_process';

const child = spawn('npm run dev', {
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_PUBLIC_USE_EMULATORS: '1',
    NEXT_PUBLIC_FB_PROJECT_ID: 'demo-deti',
    NEXT_PUBLIC_FB_API_KEY: 'demo-api-key',
    NEXT_PUBLIC_FB_AUTH_DOMAIN: 'demo-deti.firebaseapp.com',
    NEXT_PUBLIC_FB_STORAGE_BUCKET: 'demo-deti.appspot.com',
    NEXT_PUBLIC_FB_MESSAGING_SENDER_ID: '0',
    NEXT_PUBLIC_FB_APP_ID: 'demo-app-id',
  },
});
child.on('exit', (code) => process.exit(code ?? 0));
