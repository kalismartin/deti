// Verifies Firestore security rules and the pickup flow against the emulators.
// Run with emulators up: node scripts/test-rules.mjs
import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-deti' });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);

let failures = 0;
const ok = (name) => console.log(`  OK: ${name}`);
const fail = (name, e) => {
  failures++;
  console.log(`  FAIL: ${name}${e ? ` (${e.code ?? e.message})` : ''}`);
};

async function expectAllowed(name, fn) {
  try {
    await fn();
    ok(name);
  } catch (e) {
    fail(name, e);
  }
}

async function expectDenied(name, fn) {
  try {
    await fn();
    fail(name, { message: 'was allowed but should be denied' });
  } catch {
    ok(name);
  }
}

async function loginAs(sub, email, name) {
  await signOut(auth).catch(() => {});
  const cred = GoogleAuthProvider.credential(
    JSON.stringify({ sub, email, email_verified: true, name }),
  );
  const res = await signInWithCredential(auth, cred);
  return res.user.uid;
}

console.log('As owner (kalis.martin@gmail.com):');
const ownerUid = await loginAs('owner-sub', 'kalis.martin@gmail.com', 'Martin');
await expectAllowed('bootstrap self as admin', () =>
  setDoc(doc(db, 'members', ownerUid), {
    name: 'Martin',
    email: 'kalis.martin@gmail.com',
    role: 'admin',
  }),
);
await expectAllowed('read kids', async () => {
  const snap = await getDoc(doc(db, 'kids', 'ella'));
  if (!snap.exists()) throw new Error('seed missing – run npm run seed first');
});
await expectAllowed('admin claims pickup', () =>
  setDoc(
    doc(db, 'days', 'ella_2099-01-04'),
    {
      kidId: 'ella',
      date: '2099-01-04',
      window: 'afternoon',
      claimedBy: ownerUid,
      claimedByName: 'Martin',
      claimedAt: Date.now(),
    },
    { merge: true },
  ),
);
await expectDenied('day id must match kid+date', () =>
  setDoc(doc(db, 'days', 'ella_2099-01-05'), {
    kidId: 'ella',
    date: '2099-01-04',
  }),
);

// make the test idempotent: remove leftovers from previous runs
const grandmaProbe = await loginAs('grandma-sub', 'babicka@example.com', 'Babička');
await loginAs('owner-sub', 'kalis.martin@gmail.com', 'Martin');
await deleteDoc(doc(db, 'members', grandmaProbe)).catch(() => {});
await deleteDoc(doc(db, 'days', 'ella_2099-01-04')).catch(() => {});
await deleteDoc(doc(db, 'days', 'sara_2099-01-04')).catch(() => {});

console.log('As stranger (no invite):');
const strangerUid = await loginAs('stranger-sub', 'stranger@example.com', 'Stranger');
await expectDenied('bootstrap as admin', () =>
  setDoc(doc(db, 'members', strangerUid), {
    name: 'Stranger',
    email: 'stranger@example.com',
    role: 'admin',
  }),
);
await expectDenied('join with bogus invite', () =>
  setDoc(doc(db, 'members', strangerUid), {
    name: 'Stranger',
    email: 'stranger@example.com',
    role: 'unassigned',
    inviteToken: 'wrong-token',
  }),
);
await expectDenied('read kids without membership', () =>
  getDoc(doc(db, 'kids', 'ella')),
);

console.log('As grandma (valid invite):');
const grandmaUid = await loginAs('grandma-sub', 'babicka@example.com', 'Babička');
await expectAllowed('join with valid invite', () =>
  setDoc(doc(db, 'members', grandmaUid), {
    name: 'Babička',
    email: 'babicka@example.com',
    role: 'unassigned',
    inviteToken: 'test-invite-token',
  }),
);
await expectDenied('unassigned cannot claim', () =>
  setDoc(
    doc(db, 'days', 'sara_2099-01-04'),
    { kidId: 'sara', date: '2099-01-04', claimedBy: grandmaUid },
    { merge: true },
  ),
);
await expectDenied('cannot promote own role', () =>
  updateDoc(doc(db, 'members', grandmaUid), { role: 'admin' }),
);

console.log('Owner promotes grandma to adult:');
await loginAs('owner-sub', 'kalis.martin@gmail.com', 'Martin');
await expectAllowed('admin sets role=adult', () =>
  updateDoc(doc(db, 'members', grandmaUid), { role: 'adult' }),
);

console.log('As grandma (adult):');
await loginAs('grandma-sub', 'babicka@example.com', 'Babička');
await expectAllowed('adult takes over claim', () =>
  setDoc(
    doc(db, 'days', 'ella_2099-01-04'),
    {
      kidId: 'ella',
      date: '2099-01-04',
      window: 'lunch',
      claimedBy: grandmaUid,
      claimedByName: 'Babička',
      claimedAt: Date.now(),
    },
    { merge: true },
  ),
);
await expectAllowed('adult confirms pickup', () =>
  setDoc(
    doc(db, 'days', 'ella_2099-01-04'),
    {
      kidId: 'ella',
      date: '2099-01-04',
      pickedUpBy: grandmaUid,
      pickedUpByName: 'Babička',
      confirmedBy: grandmaUid,
      confirmedByName: 'Babička',
      confirmedAt: Date.now(),
    },
    { merge: true },
  ),
);
await expectAllowed('adult updates own fcmTokens', () =>
  updateDoc(doc(db, 'members', grandmaUid), { fcmTokens: ['tok1'] }),
);
await expectDenied('adult cannot edit kids', () =>
  updateDoc(doc(db, 'kids', 'ella'), { name: 'X' }),
);
await expectDenied('adult cannot edit settings', () =>
  setDoc(doc(db, 'settings', 'alerts'), { unclaimedAt: '09:00' }, { merge: true }),
);

console.log('Owner demotes grandma to child:');
await loginAs('owner-sub', 'kalis.martin@gmail.com', 'Martin');
await expectAllowed('admin sets role=child', () =>
  updateDoc(doc(db, 'members', grandmaUid), { role: 'child' }),
);

console.log('As child:');
await loginAs('grandma-sub', 'babicka@example.com', 'Babička');
await expectAllowed('child reads kids', () => getDoc(doc(db, 'kids', 'ella')));
await expectAllowed('child reads days', () =>
  getDoc(doc(db, 'days', 'ella_2099-01-04')),
);
await expectDenied('child cannot claim', () =>
  setDoc(
    doc(db, 'days', 'sara_2099-01-04'),
    { kidId: 'sara', date: '2099-01-04', claimedBy: grandmaUid },
    { merge: true },
  ),
);
await expectAllowed('child shares own location', () =>
  updateDoc(doc(db, 'members', grandmaUid), {
    location: { lat: 50.08, lng: 14.43, accuracy: 20, updatedAt: Date.now() },
  }),
);
await expectDenied('child cannot fake others location', () =>
  updateDoc(doc(db, 'members', ownerUid), {
    location: { lat: 0, lng: 0, accuracy: 1, updatedAt: Date.now() },
  }),
);

// cleanup test day docs + restore role for reuse
await loginAs('owner-sub', 'kalis.martin@gmail.com', 'Martin');
await updateDoc(doc(db, 'members', grandmaUid), { role: 'adult' }).catch(() => {});
await setDoc(
  doc(db, 'days', 'ella_2099-01-04'),
  { kidId: 'ella', date: '2099-01-04', note: deleteField() },
  { merge: true },
).catch(() => {});

console.log(failures === 0 ? '\nALL RULES TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
