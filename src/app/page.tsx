'use client';

import { useMemo, useState } from 'react';
import { KidDayCard } from '@/components/KidDayCard';
import { ChildLocationCard, KidsLocationCard } from '@/components/LocationCards';
import {
  useDays,
  useEvents,
  useExceptions,
  useHolidays,
  useKids,
  useMembers,
} from '@/lib/data';
import { resolveDay } from '@/lib/schedule';
import {
  addDays,
  formatDateCs,
  isoWeekday,
  pragueToday,
  WEEKDAY_NAMES_CS,
} from '@/lib/time';
import { dayDocId } from '@/lib/types';

export default function TodayPage() {
  const [offset, setOffset] = useState(0);
  const date = useMemo(() => addDays(pragueToday(), offset), [offset]);

  const kids = useKids();
  const members = useMembers();
  const days = useDays(date, date);
  const events = useEvents(date, date);
  const holidays = useHolidays();
  const exceptions = useExceptions();

  const loading = !kids || !members || !days || !events || !holidays || !exceptions;
  const adults = (members ?? []).filter((m) => m.role === 'admin' || m.role === 'adult');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setOffset(offset - 1)} className="p-2 text-xl">
          ←
        </button>
        <button onClick={() => setOffset(0)} className="text-center">
          <p className="font-semibold">
            {offset === 0
              ? 'Dnes'
              : offset === 1
                ? 'Zítra'
                : WEEKDAY_NAMES_CS[isoWeekday(date)]}
          </p>
          <p className="text-xs text-slate-400">{formatDateCs(date)}</p>
        </button>
        <button onClick={() => setOffset(offset + 1)} className="p-2 text-xl">
          →
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-slate-400">Načítám…</p>
      ) : kids.length === 0 ? (
        <p className="py-10 text-center text-slate-400">
          Zatím nejsou nastavené žádné děti. Přidej je ve Správě.
        </p>
      ) : (
        <>
          {kids.map((kid) => (
            <KidDayCard
              key={kid.id}
              adults={adults}
              resolved={resolveDay({
                kid,
                date,
                day: days.find(
                  (d) => dayDocId(d.kidId, d.date) === dayDocId(kid.id, date),
                ),
                events,
                holidays,
                exceptions,
              })}
            />
          ))}
          <KidsLocationCard members={members} />
          <ChildLocationCard />
        </>
      )}
    </div>
  );
}
