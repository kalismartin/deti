'use client';

import { useMemo, useState } from 'react';
import { useDays, useKids } from '@/lib/data';
import { addDays, formatDateCs, pragueToday } from '@/lib/time';
import { WINDOW_LABELS } from '@/lib/types';

export default function HistoryPage() {
  const [daysBack, setDaysBack] = useState(30);
  const today = pragueToday();
  const from = useMemo(() => addDays(today, -daysBack), [today, daysBack]);

  const kids = useKids();
  const days = useDays(from, today);

  const confirmed = useMemo(
    () =>
      (days ?? [])
        .filter((d) => d.confirmedAt)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [days],
  );

  const kidName = (id: string) => kids?.find((k) => k.id === id)?.name ?? id;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">Historie vyzvedávání</h2>
      {!days || !kids ? (
        <p className="py-10 text-center text-slate-400">Načítám…</p>
      ) : confirmed.length === 0 ? (
        <p className="py-10 text-center text-slate-400">
          Za posledních {daysBack} dní nejsou žádná potvrzená vyzvednutí.
        </p>
      ) : (
        <ul className="space-y-2">
          {confirmed.map((d) => (
            <li
              key={`${d.kidId}_${d.date}`}
              className="rounded-xl bg-white p-3 text-sm shadow-sm"
            >
              <p>
                <span className="font-semibold">{kidName(d.kidId)}</span>{' '}
                <span className="text-slate-400">{formatDateCs(d.date)}</span>
              </p>
              <p className="text-slate-600">
                Vyzvedl(a) <strong>{d.pickedUpByName}</strong>
                {d.window ? ` – ${WINDOW_LABELS[d.window]}` : ''}
                {d.confirmedBy !== d.pickedUpBy && d.confirmedByName
                  ? ` (potvrdil(a) ${d.confirmedByName})`
                  : ''}
              </p>
              {d.note && <p className="text-xs text-slate-400">📝 {d.note}</p>}
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={() => setDaysBack(daysBack + 60)}
        className="w-full py-2 text-sm text-brand underline"
      >
        Načíst starší
      </button>
    </div>
  );
}
