'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Query,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  AlertSettings,
  ChoreDay,
  ChoreState,
  DayDoc,
  FamilyEvent,
  Holiday,
  Invite,
  Kid,
  Member,
  PocketEntry,
  ScheduleException,
  WindowKey,
} from './types';
import { DEFAULT_ALERT_SETTINGS, dayDocId } from './types';

function useCollection<T>(q: Query<DocumentData> | null, idField = 'id'): T[] | null {
  const [items, setItems] = useState<T[] | null>(null);
  useEffect(() => {
    if (!q) return;
    return onSnapshot(
      q,
      (snap) => setItems(snap.docs.map((d) => ({ [idField]: d.id, ...d.data() }) as T)),
      (err) => {
        console.error('snapshot error', err);
        setItems([]);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return items;
}

export function useKids(): Kid[] | null {
  const q = useMemo(() => query(collection(db(), 'kids')), []);
  const kids = useCollection<Kid>(q);
  return useMemo(
    () => (kids ? [...kids].sort((a, b) => a.order - b.order) : null),
    [kids],
  );
}

export function useMembers(): Member[] | null {
  const q = useMemo(() => query(collection(db(), 'members')), []);
  return useCollection<Member>(q, 'uid');
}

export function useInvites(): Invite[] | null {
  const q = useMemo(() => query(collection(db(), 'invites')), []);
  return useCollection<Invite>(q, 'token');
}

export function useDays(from: string, to: string): DayDoc[] | null {
  const q = useMemo(
    () =>
      query(
        collection(db(), 'days'),
        where('date', '>=', from),
        where('date', '<=', to),
      ),
    [from, to],
  );
  return useCollection<DayDoc>(q);
}

export function useEvents(from: string, to: string): FamilyEvent[] | null {
  const q = useMemo(
    () =>
      query(
        collection(db(), 'events'),
        where('date', '>=', from),
        where('date', '<=', to),
      ),
    [from, to],
  );
  return useCollection<FamilyEvent>(q);
}

export function useAllEvents(): FamilyEvent[] | null {
  const q = useMemo(() => query(collection(db(), 'events')), []);
  return useCollection<FamilyEvent>(q);
}

export function useHolidays(): Holiday[] | null {
  const q = useMemo(() => query(collection(db(), 'holidays')), []);
  return useCollection<Holiday>(q);
}

export function useExceptions(): ScheduleException[] | null {
  const q = useMemo(() => query(collection(db(), 'exceptions')), []);
  return useCollection<ScheduleException>(q);
}

export function useAlertSettings(): AlertSettings | null {
  const [settings, setSettings] = useState<AlertSettings | null>(null);
  useEffect(() => {
    return onSnapshot(doc(db(), 'settings', 'alerts'), (snap) => {
      setSettings(
        snap.exists()
          ? { ...DEFAULT_ALERT_SETTINGS, ...(snap.data() as Partial<AlertSettings>) }
          : DEFAULT_ALERT_SETTINGS,
      );
    });
  }, []);
  return settings;
}

// ---------- pickup actions ----------

export async function claimPickup(
  kidId: string,
  date: string,
  window: WindowKey,
  member: Member,
): Promise<void> {
  await setDoc(
    doc(db(), 'days', dayDocId(kidId, date)),
    {
      kidId,
      date,
      window,
      claimedBy: member.uid,
      claimedByName: member.name,
      claimedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function unclaimPickup(kidId: string, date: string): Promise<void> {
  await updateDoc(doc(db(), 'days', dayDocId(kidId, date)), {
    window: deleteField(),
    claimedBy: deleteField(),
    claimedByName: deleteField(),
    claimedAt: deleteField(),
    alerts: deleteField(),
  });
}

export async function confirmPickup(
  kidId: string,
  date: string,
  confirmer: Member,
  pickedUpBy: { uid: string; name: string },
): Promise<void> {
  await setDoc(
    doc(db(), 'days', dayDocId(kidId, date)),
    {
      kidId,
      date,
      pickedUpBy: pickedUpBy.uid,
      pickedUpByName: pickedUpBy.name,
      confirmedBy: confirmer.uid,
      confirmedByName: confirmer.name,
      confirmedAt: Date.now(),
    },
    { merge: true },
  );
}

export async function unconfirmPickup(kidId: string, date: string): Promise<void> {
  await updateDoc(doc(db(), 'days', dayDocId(kidId, date)), {
    pickedUpBy: deleteField(),
    pickedUpByName: deleteField(),
    confirmedBy: deleteField(),
    confirmedByName: deleteField(),
    confirmedAt: deleteField(),
  });
}

export async function setDayNote(
  kidId: string,
  date: string,
  note: string,
): Promise<void> {
  await setDoc(
    doc(db(), 'days', dayDocId(kidId, date)),
    note ? { kidId, date, note } : { kidId, date, note: deleteField() },
    { merge: true },
  );
}

// ---------- pocket money (Banka) ----------

export function useChoreDays(from: string, to: string): ChoreDay[] | null {
  const q = useMemo(
    () =>
      query(
        collection(db(), 'choreDays'),
        where('date', '>=', from),
        where('date', '<=', to),
      ),
    [from, to],
  );
  return useCollection<ChoreDay>(q);
}

/** full history — needed for the balance */
export function useAllChoreDays(): ChoreDay[] | null {
  const q = useMemo(() => query(collection(db(), 'choreDays')), []);
  return useCollection<ChoreDay>(q);
}

export function usePocket(): PocketEntry[] | null {
  const q = useMemo(() => query(collection(db(), 'pocket')), []);
  return useCollection<PocketEntry>(q);
}

/** kid reports their room as clean (today or yesterday) */
export async function suggestClean(
  kidId: string,
  date: string,
  note: string,
): Promise<void> {
  await setDoc(
    doc(db(), 'choreDays', dayDocId(kidId, date)),
    {
      kidId,
      date,
      suggestedAt: Date.now(),
      ...(note ? { suggestedNote: note } : {}),
    },
    { merge: true },
  );
}

/** guardian verdict for a day (may also overwrite an earlier verdict) */
export async function reviewChoreDay(
  kidId: string,
  date: string,
  state: ChoreState,
  reviewer: Member,
): Promise<void> {
  await setDoc(
    doc(db(), 'choreDays', dayDocId(kidId, date)),
    {
      kidId,
      date,
      state,
      reviewedBy: reviewer.uid,
      reviewedByName: reviewer.name,
      reviewedAt: Date.now(),
    },
    { merge: true },
  );
}

/** adult adds a signed bonus/penalty with a label */
export async function addBonus(
  kidId: string,
  amount: number,
  label: string,
  by: Member,
): Promise<void> {
  await setDoc(doc(collection(db(), 'pocket')), {
    kidId,
    type: 'bonus',
    amount,
    label,
    createdBy: by.uid,
    createdByName: by.name,
    createdAt: Date.now(),
  });
}

/** kid asks for a payout */
export async function requestCashout(
  kidId: string,
  amount: number,
  comment: string,
  by: Member,
): Promise<void> {
  await setDoc(doc(collection(db(), 'pocket')), {
    kidId,
    type: 'cashout',
    status: 'requested',
    amount,
    label: comment,
    createdBy: by.uid,
    createdByName: by.name,
    createdAt: Date.now(),
  });
}

/** guardian hands over the cash and records it */
export async function payCashout(entryId: string, by: Member): Promise<void> {
  await updateDoc(doc(db(), 'pocket', entryId), {
    status: 'paid',
    paidBy: by.uid,
    paidByName: by.name,
    paidAt: Date.now(),
  });
}

/** guardian records a payout directly (no request) */
export async function recordPayout(
  kidId: string,
  amount: number,
  comment: string,
  by: Member,
): Promise<void> {
  await setDoc(doc(collection(db(), 'pocket')), {
    kidId,
    type: 'cashout',
    status: 'paid',
    amount,
    label: comment,
    createdBy: by.uid,
    createdByName: by.name,
    createdAt: Date.now(),
    paidBy: by.uid,
    paidByName: by.name,
    paidAt: Date.now(),
  });
}

/** dismiss a pending request (guardian, or the kid changing their mind) */
export async function dismissCashout(entryId: string): Promise<void> {
  await deleteDoc(doc(db(), 'pocket', entryId));
}

// ---------- admin CRUD ----------

export async function saveDocIn(
  coll: string,
  id: string | undefined,
  data: Record<string, unknown>,
): Promise<void> {
  const ref = id ? doc(db(), coll, id) : doc(collection(db(), coll));
  await setDoc(ref, data, { merge: true });
}

export async function removeDocIn(coll: string, id: string): Promise<void> {
  await deleteDoc(doc(db(), coll, id));
}
