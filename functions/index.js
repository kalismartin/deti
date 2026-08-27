import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';

initializeApp();
const db = getFirestore();

const TZ = 'Europe/Prague';

const DEFAULT_SETTINGS = {
  unclaimedAt: '11:00',
  unclaimedEnabled: true,
  urgentBeforeMin: 90,
  urgentEnabled: true,
  endOfWindowEnabled: true,
  nudgeBeforeMin: 90,
  nudgeEnabled: true,
};

function pragueNow() {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const time = `${get('hour')}:${get('minute')}`;
  const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[
    get('weekday').replace('.', '')
  ];
  return { date, time, weekday };
}

const hmToMin = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Runs every 5 minutes during pickup-relevant hours and walks the alert
 * ladder for each kid. Dedup flags are stored on the day document under
 * `alerts` so each alert fires at most once per kid per day.
 */
export const alertLadder = onSchedule(
  { schedule: 'every 5 minutes from 06:00 to 19:00', timeZone: TZ, region: 'europe-west1' },
  async () => {
    const { date, time, weekday } = pragueNow();
    if (weekday >= 6) return; // weekend

    const [settingsSnap, kidsSnap, holidaysSnap, exceptionsSnap, eventsSnap, membersSnap] =
      await Promise.all([
        db.doc('settings/alerts').get(),
        db.collection('kids').get(),
        db.collection('holidays').get(),
        db.collection('exceptions').where('date', '==', date).get(),
        db.collection('events').where('date', '==', date).get(),
        db.collection('members').get(),
      ]);

    const settings = { ...DEFAULT_SETTINGS, ...(settingsSnap.data() ?? {}) };
    const members = membersSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    const adults = members.filter((m) => m.role === 'admin' || m.role === 'adult');
    const nowMin = hmToMin(time);

    for (const kidDoc of kidsSnap.docs) {
      const kid = { id: kidDoc.id, ...kidDoc.data() };

      const onHoliday = holidaysSnap.docs.some((h) => {
        const d = h.data();
        return d.kidIds?.includes(kid.id) && d.from <= date && date <= d.to;
      });
      const exception = exceptionsSnap.docs
        .map((d) => d.data())
        .find((x) => x.kidId === kid.id);
      if (onHoliday || exception?.closed) continue;

      const windows = {
        lunch: { ...kid.windows.lunch, ...(exception?.windows?.lunch ?? {}) },
        afternoon: { ...kid.windows.afternoon, ...(exception?.windows?.afternoon ?? {}) },
      };
      const pickupAt = eventsSnap.docs
        .map((d) => d.data())
        .find((e) => e.kidIds?.includes(kid.id) && e.pickupAt)?.pickupAt;

      const dayRef = db.doc(`days/${kid.id}_${date}`);
      const daySnap = await dayRef.get();
      const day = daySnap.exists ? daySnap.data() : {};
      const alerts = day.alerts ?? {};

      const claimed = !!day.claimedBy;
      const confirmed = !!day.confirmedAt;
      const windowKey = day.window ?? 'afternoon';
      const win = windows[windowKey];
      let startMin = hmToMin(win.start);
      let endMin = hmToMin(win.end);
      if (pickupAt) {
        const p = hmToMin(pickupAt);
        if (p < endMin) endMin = p;
        if (p < startMin) startMin = p;
      }

      const send = async (flag, recipients, title, body) => {
        if (alerts[flag]) return;
        await dayRef.set({ kidId: kid.id, date }, { merge: true });
        await dayRef.update({ [`alerts.${flag}`]: true });
        await sendPush(recipients, title, body);
        logger.info(`alert ${flag} for ${kid.name} (${date}) → ${recipients.length} adults`);
      };

      if (confirmed) continue;

      if (!claimed) {
        // 1. morning unclaimed alert
        if (settings.unclaimedEnabled && nowMin >= hmToMin(settings.unclaimedAt)) {
          await send(
            'unclaimed',
            adults,
            `${kid.name}: nikdo nevyzvedává`,
            `Dnes zatím nikdo nemá zamluvené vyzvednutí. Okna: ${windows.lunch.start}–${windows.lunch.end} / ${windows.afternoon.start}–${windows.afternoon.end}.`,
          );
        }
        // 2. urgent unclaimed alert before window start
        if (settings.urgentEnabled && nowMin >= startMin - settings.urgentBeforeMin) {
          await send(
            'urgent',
            adults,
            `‼️ ${kid.name}: stále nikdo nevyzvedává!`,
            `Vyzvedávání začíná v ${win.start}. Domluvte se, kdo dnes jde!`,
          );
        }
      } else {
        const claimer = members.find((m) => m.uid === day.claimedBy);
        // 4. quiet nudge to the claimer
        if (settings.nudgeEnabled && claimer && nowMin >= startMin - settings.nudgeBeforeMin) {
          await send(
            'nudge',
            [claimer],
            `Připomínka: ${kid.name}`,
            `Dnes vyzvedáváš (${win.start}–${win.end}${pickupAt ? `, kvůli akci do ${pickupAt}` : ''}).`,
          );
        }
        // 3. end of window, still unconfirmed
        if (settings.endOfWindowEnabled && nowMin >= endMin) {
          await send(
            'endOfWindow',
            adults,
            `⚠️ ${kid.name}: vyzvednutí nepotvrzeno`,
            `${day.claimedByName ?? 'Někdo'} měl(a) vyzvednout, ale vyzvednutí není potvrzené. Ověřte to!`,
          );
        }
      }
    }
  },
);

/**
 * Reacts to claim changes on day documents:
 * - claim removed → notify all adults the day is uncovered again
 * - claim taken over → notify the previous claimer
 */
export const onDayChange = onDocumentWritten(
  { document: 'days/{dayId}', region: 'europe-west1' },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before?.claimedBy) return;

    const kidSnap = await db.doc(`kids/${before.kidId}`).get();
    const kidName = kidSnap.data()?.name ?? 'dítě';

    if (after && !after.claimedBy && !after.confirmedAt) {
      const membersSnap = await db.collection('members').get();
      const adults = membersSnap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((m) => m.role === 'admin' || m.role === 'adult');
      await sendPush(
        adults,
        `${kidName}: vyzvednutí zrušeno`,
        `${before.claimedByName ?? 'Někdo'} zrušil(a) vyzvednutí (${before.date}). Kdo to vezme?`,
      );
    } else if (
      after?.claimedBy &&
      after.claimedBy !== before.claimedBy &&
      !after.confirmedAt
    ) {
      const prevSnap = await db.doc(`members/${before.claimedBy}`).get();
      if (prevSnap.exists) {
        await sendPush(
          [{ uid: prevSnap.id, ...prevSnap.data() }],
          `${kidName}: vyzvednutí převzato`,
          `${after.claimedByName ?? 'Někdo'} převzal(a) tvoje vyzvednutí (${after.date}).`,
        );
      }
    }
  },
);

async function sendPush(recipients, title, body) {
  const tokens = [...new Set(recipients.flatMap((m) => m.fcmTokens ?? []))];
  if (tokens.length === 0) return;
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      notification: { title, body, icon: '/icons/icon-192.png' },
      fcmOptions: { link: '/' },
    },
  });
  // prune tokens that are no longer valid
  const invalid = new Set();
  res.responses.forEach((r, i) => {
    if (
      r.error &&
      ['messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(
        r.error.code,
      )
    ) {
      invalid.add(tokens[i]);
    }
  });
  if (invalid.size > 0) {
    for (const m of recipients) {
      const bad = (m.fcmTokens ?? []).filter((t) => invalid.has(t));
      if (bad.length > 0) {
        await db.doc(`members/${m.uid}`).update({
          fcmTokens: FieldValue.arrayRemove(...bad),
        });
      }
    }
  }
}
