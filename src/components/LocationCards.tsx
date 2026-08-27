'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  checkIn,
  setSharingPreferred,
  sharingPreferred,
  startSharing,
  stopSharing,
} from '@/lib/location';
import { LocationMap } from '@/components/LocationMap';
import type { Member } from '@/lib/types';

const MAP_COLORS = ['#2563eb', '#db2777', '#16a34a', '#d97706', '#7c3aed'];

function timeAgoCs(ms: number): string {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'právě teď';
  if (min < 60) return `před ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `před ${h} h`;
  return `před ${Math.floor(h / 24)} dny`;
}

/** Shown to child accounts: share own location. */
export function ChildLocationCard() {
  const { member } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setSharing(sharingPreferred());
  }, []);

  if (!member || member.role !== 'child') return null;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-bold">📍 Moje poloha</h2>
      <p className="mt-1 text-xs text-slate-400">
        Polohu vidí jen rodina, a jen když máš aplikaci otevřenou.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            const err = await checkIn(member.uid);
            setMsg(err ?? 'Poloha odeslána ✓');
            setBusy(false);
          }}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Jsem tady!
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={sharing}
            onChange={(e) => {
              const v = e.target.checked;
              setSharing(v);
              setSharingPreferred(v);
              if (v) startSharing(member.uid);
              else stopSharing();
            }}
            className="h-4 w-4"
          />
          sdílet průběžně, když je aplikace otevřená
        </label>
      </div>
      {msg && <p className="mt-2 text-sm text-slate-500">{msg}</p>}
    </section>
  );
}

/** Last known locations of child accounts — visible to the whole family,
 * kids included, so siblings see each other too. */
export function KidsLocationCard({ members }: { members: Member[] }) {
  const kidsWithLocation = members.filter((m) => m.role === 'child' && m.location);
  if (kidsWithLocation.length === 0) return null;

  const points = kidsWithLocation.map((m, i) => ({
    id: m.uid,
    name: m.name,
    lat: m.location!.lat,
    lng: m.location!.lng,
    accuracy: m.location!.accuracy,
    updatedAt: m.location!.updatedAt,
    color: MAP_COLORS[i % MAP_COLORS.length],
  }));

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-bold">📍 Kde jsou děti</h2>
      <div className="mt-3 overflow-hidden rounded-xl">
        <LocationMap points={points} />
      </div>
      <ul className="mt-2 space-y-1.5">
        {kidsWithLocation.map((m, i) => (
          <li key={m.uid} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: MAP_COLORS[i % MAP_COLORS.length] }}
              />
              <span className="font-medium">{m.name}</span>{' '}
              <span className="text-slate-400">
                {timeAgoCs(m.location!.updatedAt)} (±{m.location!.accuracy} m)
              </span>
            </span>
            <a
              href={`https://maps.google.com/?q=${m.location!.lat},${m.location!.lng}`}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-brand underline"
            >
              navigovat
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-400">
        Poloha se aktualizuje, jen když má dítě aplikaci otevřenou.
      </p>
    </section>
  );
}
