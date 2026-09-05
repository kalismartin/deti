// Seeds the real family data into Firestore.
//
// Against the emulator:  npm run seed:emu   (= node scripts/seed.mjs --emulator)
// Against production:    GOOGLE_APPLICATION_CREDENTIALS=service-account.json npm run seed
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (process.argv.includes('--emulator')) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
}

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

// ---------------------------------------------------------------------------
// Kids
// ---------------------------------------------------------------------------

const kids = {
  sara: {
    name: 'Sára',
    type: 'school',
    className: '3.B',
    color: '#2563eb',
    arrival: { start: '07:40', end: '08:00' },
    windows: {
      lunch: { start: '13:30', end: '14:00', label: 'Po obědě' },
      afternoon: { start: '15:30', end: '17:00', label: 'Odpoledne' },
    },
    // rozvrh 3.B platný od 7. 9. 2026 (Bakaláři); AJ = 1. skupina (Suchá)
    hourSchedule: {
      1: [
        { start: '08:00', end: '08:45', subject: 'Čeština' },
        { start: '08:55', end: '09:40', subject: 'Matematika' },
        { start: '10:00', end: '10:45', subject: 'Hudebka' },
        { start: '10:55', end: '11:40', subject: 'Angličtina' },
        { start: '11:50', end: '12:35', subject: 'Tělocvik' },
      ],
      2: [
        { start: '08:00', end: '08:45', subject: 'Čeština' },
        { start: '08:55', end: '09:40', subject: 'Matematika' },
        { start: '10:00', end: '10:45', subject: 'Prvouka' },
        { start: '10:55', end: '11:40', subject: 'Čeština' },
        { start: '11:50', end: '12:35', subject: 'Pracovky' },
      ],
      3: [
        { start: '08:00', end: '08:45', subject: 'Čeština' },
        { start: '08:55', end: '09:40', subject: 'Angličtina' },
        { start: '10:00', end: '10:45', subject: 'Matematika' },
        { start: '10:55', end: '11:40', subject: 'Prvouka' },
      ],
      4: [
        { start: '08:00', end: '08:45', subject: 'Čeština' },
        { start: '08:55', end: '09:40', subject: 'Matematika' },
        { start: '10:00', end: '10:45', subject: 'Čeština' },
        { start: '10:55', end: '11:40', subject: 'Prvouka' },
        { start: '11:50', end: '12:35', subject: 'Výtvarka' },
      ],
      5: [
        { start: '08:00', end: '08:45', subject: 'Čeština' },
        { start: '08:55', end: '09:40', subject: 'Angličtina' },
        { start: '10:00', end: '10:45', subject: 'Matematika' },
        { start: '10:55', end: '11:40', subject: 'Čeština' },
        { start: '11:50', end: '12:35', subject: 'Tělocvik' },
      ],
    },
    // pocket money: daily room check on; guardians (uids) set by admin in prod
    chores: { cleaning: true, dailyAmount: 5 },
    guardians: [],
    order: 1,
  },
  ella: {
    name: 'Ella',
    type: 'preschool',
    className: 'Butterflies',
    color: '#db2777',
    arrival: { start: '07:30', end: '08:45' },
    windows: {
      lunch: { start: '12:40', end: '13:00', label: 'Po obědě' },
      afternoon: { start: '15:00', end: '17:45', label: 'Odpoledne' },
    },
    hourSchedule: {},
    chores: { cleaning: false, dailyAmount: 5 },
    guardians: [],
    order: 2,
  },
};

// ---------------------------------------------------------------------------
// Holidays — státní svátky a školní prázdniny 2026/27 (Sára = škola;
// u Elly jen svátky + vánoční provoz školky, upravit podle skutečných uzavírek)
// ---------------------------------------------------------------------------

const holidays = {
  'letni-prazdniny-2026': {
    label: 'Letní prázdniny',
    from: '2026-07-01',
    to: '2026-08-31',
    kidIds: ['sara', 'ella'],
  },
  'letni-prazdniny-2027': {
    label: 'Letní prázdniny',
    from: '2027-07-01',
    to: '2027-08-31',
    kidIds: ['sara', 'ella'],
  },
  'svatek-2026-09-28': {
    label: 'Den české státnosti',
    from: '2026-09-28',
    to: '2026-09-28',
    kidIds: ['sara', 'ella'],
  },
  'podzimni-prazdniny-2026': {
    label: 'Podzimní prázdniny',
    from: '2026-10-26',
    to: '2026-10-27',
    kidIds: ['sara'],
  },
  'svatek-2026-10-28': {
    label: 'Den vzniku ČSR',
    from: '2026-10-28',
    to: '2026-10-28',
    kidIds: ['sara', 'ella'],
  },
  'svatek-2026-11-17': {
    label: 'Den boje za svobodu',
    from: '2026-11-17',
    to: '2026-11-17',
    kidIds: ['sara', 'ella'],
  },
  'vanocni-prazdniny-2026': {
    label: 'Vánoční prázdniny',
    from: '2026-12-23',
    to: '2027-01-03',
    kidIds: ['sara', 'ella'],
  },
  'pololetni-prazdniny-2027': {
    label: 'Pololetní prázdniny',
    from: '2027-01-29',
    to: '2027-01-29',
    kidIds: ['sara'],
  },
};

// ---------------------------------------------------------------------------
// Recurring activities → one event per lesson date. Lessons are skipped on
// any holiday above (providers follow the school calendar).
// ---------------------------------------------------------------------------

const skipDates = new Set();
for (const h of Object.values(holidays)) {
  for (
    const d = new Date(`${h.from}T12:00:00Z`);
    d.toISOString().slice(0, 10) <= h.to;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    skipDates.add(d.toISOString().slice(0, 10));
  }
}

/** weekly occurrences from `first` (sets the weekday) through `last`, minus skipDates */
function weeklyDates(first, last) {
  const dates = [];
  for (const d = new Date(`${first}T12:00:00Z`); ; d.setUTCDate(d.getUTCDate() + 7)) {
    const date = d.toISOString().slice(0, 10);
    if (date > last) break;
    if (!skipDates.has(date)) dates.push(date);
  }
  return dates;
}

const activities = [
  // Plavání: pondělí 18:00, obě, 14. 9. 2026 – 18. 1. 2027 (16 lekcí)
  { id: 'plavani', title: 'Plavání', kidIds: ['sara', 'ella'], first: '2026-09-14', last: '2027-01-18', start: '18:00', end: '19:00', advertised: 16 },
  // Balet 6–9 let: úterý 16:30–17:30, 15. 9. 2026 – 31. 1. 2027 (15 lekcí, Viktorie F.)
  { id: 'balet', title: 'Balet', kidIds: ['ella'], first: '2026-09-15', last: '2027-01-31', start: '16:30', end: '17:30', advertised: 15 },
  // Dramatický kroužek 4,5–7 let: čtvrtek 15:30–16:30, 17. 9. 2026 – 31. 1. 2027 (14 lekcí, Bára V.)
  { id: 'dramatak', title: 'Dramatický kroužek', kidIds: ['ella'], first: '2026-09-17', last: '2027-01-31', start: '15:30', end: '16:30', advertised: 14 },
  // Sportovně tenisový kroužek: pátek 13:30–14:30, 18. 9. 2026 – 31. 1. 2027 (14 lekcí, Jakub Khek)
  { id: 'tenis', title: 'Tenis', kidIds: ['ella'], first: '2026-09-18', last: '2027-01-31', start: '13:30', end: '14:30', advertised: 14 },
  // Basketball: úterý 15:30–16:30, od druhého týdne školy (8. 9. 2026); konec odhad
  { id: 'basketbal', title: 'Basketbal', kidIds: ['sara'], first: '2026-09-08', last: '2027-01-31', start: '15:30', end: '16:30' },
];

const events = {};
for (const a of activities) {
  const dates = weeklyDates(a.first, a.last);
  for (const date of dates) {
    events[`${a.id}-${date}`] = {
      title: a.title,
      date,
      start: a.start,
      end: a.end,
      kidIds: a.kidIds,
      pickupAt: '',
    };
  }
  const note = a.advertised ? ` (web uvádí ${a.advertised})` : '';
  console.log(`${a.title}: ${dates.length} lekcí${note}`);
}

// ---------------------------------------------------------------------------

async function seedCollection(coll, docs) {
  for (const [id, data] of Object.entries(docs)) {
    await db.doc(`${coll}/${id}`).set(data, { merge: true });
  }
  console.log(`${coll}: ${Object.keys(docs).length} docs`);
}

await seedCollection('kids', kids);
await seedCollection('events', events);
await seedCollection('holidays', holidays);
if (process.env.FIRESTORE_EMULATOR_HOST) {
  // test invite only for local development — in production create invites in the app
  await seedCollection('invites', {
    'test-invite-token': {
      createdBy: 'seed',
      createdAt: Date.now(),
      active: true,
      label: 'Testovací pozvánka',
    },
  });
}
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
