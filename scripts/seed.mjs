// Seeds testing data into Firestore.
//
// Against the emulator:  FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed
// Against production:    GOOGLE_APPLICATION_CREDENTIALS=service-account.json npm run seed
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId =
  process.env.GCLOUD_PROJECT ??
  process.env.NEXT_PUBLIC_FB_PROJECT_ID ??
  (process.env.FIRESTORE_EMULATOR_HOST ? 'demo-deti' : undefined);

if (!projectId) {
  console.error('Set NEXT_PUBLIC_FB_PROJECT_ID or FIRESTORE_EMULATOR_HOST first.');
  process.exit(1);
}

initializeApp({
  projectId,
  ...(process.env.GOOGLE_APPLICATION_CREDENTIALS ? { credential: applicationDefault() } : {}),
});
const db = getFirestore();

function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** next occurrence of ISO weekday (1 = Monday … 5 = Friday), at least tomorrow */
function nextWeekday(target) {
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const wd = d.getDay() === 0 ? 7 : d.getDay();
    if (wd === target) return d.toISOString().slice(0, 10);
  }
  return isoDate(1);
}

const kids = {
  tomas: {
    name: 'Tomáš (test)',
    type: 'school',
    className: '2.A',
    color: '#2563eb',
    arrival: { start: '07:40', end: '08:00' },
    windows: {
      lunch: { start: '12:30', end: '14:30', label: 'Po obědě' },
      afternoon: { start: '15:30', end: '17:00', label: 'Odpoledne' },
    },
    hourSchedule: {
      1: [
        { start: '08:00', end: '08:45', subject: 'Čeština' },
        { start: '08:55', end: '09:40', subject: 'Matematika' },
        { start: '10:00', end: '10:45', subject: 'Prvouka' },
        { start: '10:55', end: '11:40', subject: 'Tělocvik' },
      ],
      2: [
        { start: '08:00', end: '08:45', subject: 'Matematika' },
        { start: '08:55', end: '09:40', subject: 'Čeština' },
        { start: '10:00', end: '10:45', subject: 'Angličtina' },
        { start: '10:55', end: '11:40', subject: 'Výtvarka' },
      ],
      3: [
        { start: '08:00', end: '08:45', subject: 'Čeština' },
        { start: '08:55', end: '09:40', subject: 'Matematika' },
        { start: '10:00', end: '10:45', subject: 'Hudebka' },
      ],
      4: [
        { start: '08:00', end: '08:45', subject: 'Matematika' },
        { start: '08:55', end: '09:40', subject: 'Prvouka' },
        { start: '10:00', end: '10:45', subject: 'Čeština' },
        { start: '10:55', end: '11:40', subject: 'Pracovky' },
      ],
      5: [
        { start: '08:00', end: '08:45', subject: 'Čeština' },
        { start: '08:55', end: '09:40', subject: 'Angličtina' },
        { start: '10:00', end: '10:45', subject: 'Matematika' },
      ],
    },
    order: 1,
  },
  terezka: {
    name: 'Terezka (test)',
    type: 'preschool',
    className: 'Ptáčci a Butterflies',
    color: '#db2777',
    arrival: { start: '07:30', end: '08:45' },
    windows: {
      lunch: { start: '12:40', end: '13:00', label: 'Po obědě' },
      afternoon: { start: '15:00', end: '17:45', label: 'Odpoledne' },
    },
    hourSchedule: {},
    order: 2,
  },
};

const events = {
  'test-plavani': {
    title: 'Plavání (test)',
    date: nextWeekday(2),
    start: '15:00',
    end: '16:00',
    kidIds: ['tomas'],
    pickupAt: '14:15',
  },
  'test-divadlo': {
    title: 'Divadlo ve školce (test)',
    date: nextWeekday(4),
    start: '09:30',
    end: '10:30',
    kidIds: ['terezka'],
    pickupAt: '',
  },
};

const holidays = {
  'test-reditelske-volno': {
    label: 'Ředitelské volno (test)',
    from: isoDate(10),
    to: isoDate(10),
    kidIds: ['tomas'],
  },
};

const invites = {
  'test-invite-token': {
    createdBy: 'seed',
    createdAt: Date.now(),
    active: true,
    label: 'Testovací pozvánka',
  },
};

async function seedCollection(coll, docs) {
  for (const [id, data] of Object.entries(docs)) {
    await db.doc(`${coll}/${id}`).set(data, { merge: true });
  }
  console.log(`${coll}: ${Object.keys(docs).length} docs`);
}

await seedCollection('kids', kids);
await seedCollection('events', events);
await seedCollection('holidays', holidays);
await seedCollection('invites', invites);
await db.doc('settings/alerts').set(
  {
    unclaimedAt: '11:00',
    unclaimedEnabled: true,
    urgentBeforeMin: 90,
    urgentEnabled: true,
    endOfWindowEnabled: true,
    nudgeBeforeMin: 90,
    nudgeEnabled: true,
  },
  { merge: true },
);
console.log('settings: 1 doc');
console.log(`Seed done (project: ${projectId}).`);
