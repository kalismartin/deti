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
  DayDoc,
  FamilyEvent,
  Holiday,
  Invite,
  Kid,
  Member,
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
