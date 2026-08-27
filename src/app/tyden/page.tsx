'use client';

import { useMemo, useState } from 'react';
import {
  useDays,
  useEvents,
  useExceptions,
  useHolidays,
  useKids,
} from '@/lib/data';
import { resolveDay } from '@/lib/schedule';
import {
  addDays,
  formatDateShortCs,
  pragueToday,
  weekStart,
  WEEKDAY_SHORT_CS,
  isoWeekday,
} from '@/lib/time';
import { WINDOW_LABELS, dayDocId } from '@/lib/types';

const STATE_DOT: Record<string, string> = {
  rest: 'bg-slate-300',
  unclaimed: 'bg-unclaimed',
  claimed: 'bg-claimed',
  confirmed: 'bg-confirmed',
};

export default function WeekPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const monday = useMemo(
    () => addDays(weekStart(pragueToday()), weekOffset * 7),
    [weekOffset],
  );
  const sunday = addDays(monday, 6);
  const today = pragueToday();

  const kids = useKids();
  const days = useDays(monday, sunday);
  const events = useEvents(monday, sunday);
  const holidays = useHolidays();
  const exceptions = useExceptions();

  const loading = !kids || !days || !events || !holidays || !exceptions;
  const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 text-xl">
          ←
        </button>
        <button onClick={() => setWeekOffset(0)} className="text-center">
          <p className="font-semibold">
            {weekOffset === 0 ? 'Tento týden' : weekOffset === 1 ? 'Příští týden' : 'Týden'}
          </p>
          <p className="text-xs text-slate-400">
            {formatDateShortCs(monday)} – {formatDateShortCs(sunday)}
          </p>
        </button>
        <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 text-xl">
          →
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-slate-400">Načítám…</p>
      ) : (
        dates.map((date) => (
          <div
            key={date}
            className={`rounded-xl bg-white p-3 shadow-sm ${
              date === today ? 'ring-2 ring-brand/40' : ''
            }`}
          >
            <p className="mb-1 text-sm font-semibold">
              {WEEKDAY_SHORT_CS[isoWeekday(date)]} {formatDateShortCs(date)}
              {date === today && <span className="ml-2 text-xs text-brand">dnes</span>}
            </p>
            <div className="space-y-1">
              {kids.map((kid) => {
                const r = resolveDay({
                  kid,
                  date,
                  day: days.find(
                    (d) => dayDocId(d.kidId, d.date) === dayDocId(kid.id, date),
                  ),
                  events,
                  holidays,
                  exceptions,
                });
                return (
                  <div key={kid.id} className="flex items-start gap-2 text-sm">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STATE_DOT[r.state]}`}
                    />
                    <div className="min-w-0">
                      <span className="font-medium">{kid.name}</span>{' '}
                      <span className="text-slate-500">
                        {r.state === 'rest'
                          ? r.restReason
                          : r.state === 'unclaimed'
                            ? 'nikdo nevyzvedává'
                            : r.state === 'claimed'
                              ? `${r.day?.claimedByName} (${WINDOW_LABELS[r.day?.window ?? 'afternoon']})`
                              : `vyzvedl(a) ${r.day?.pickedUpByName}`}
                      </span>
                      {r.events.map((e) => (
                        <p key={e.id} className="truncate text-xs text-slate-400">
                          ⭐ {e.title}
                          {e.start ? ` ${e.start}` : ''}
                          {e.pickupAt ? ` (vyzvednout ve ${e.pickupAt})` : ''}
                        </p>
                      ))}
                      {r.day?.note && (
                        <p className="truncate text-xs text-slate-400">📝 {r.day.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
