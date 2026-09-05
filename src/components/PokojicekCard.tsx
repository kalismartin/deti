'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { reviewChoreDay, suggestClean, useChoreDays } from '@/lib/data';
import { addDays, formatDateCs, pragueToday } from '@/lib/time';
import type { ChoreDay, Kid } from '@/lib/types';
import { IconSparkles } from '@/components/icons';

/**
 * Daily room-cleanliness game on the Dnes page, one row per kid with the
 * game enabled. The kid reports a clean room; a guardian confirms or rejects.
 * Yesterday stays judgeable until it slips out of the two-day window.
 */
export function PokojicekCard({ kids }: { kids: Kid[] }) {
  const { member } = useAuth();
  const today = pragueToday();
  const yesterday = addDays(today, -1);
  const choreDays = useChoreDays(yesterday, today);

  const gameKids = kids.filter((k) => k.chores?.cleaning);
  if (gameKids.length === 0 || !member || !choreDays) return null;

  const dayFor = (kidId: string, date: string) =>
    choreDays.find((d) => d.kidId === kidId && d.date === date);

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
      <h2 className="flex items-center gap-2 font-bold">
        <IconSparkles className="h-5 w-5 text-amber-500" /> Pokojíček
      </h2>
      <div className="mt-2 space-y-3">
        {gameKids.map((kid) => {
          const isSelf = member.kidId === kid.id;
          const isGuardian = kid.guardians?.includes(member.uid) ?? false;
          const days: { date: string; label: string }[] = [];
          const yDay = dayFor(kid.id, yesterday);
          // yesterday still shows while unjudged with a pending suggestion,
          // or for guardians who want to judge it late
          if ((yDay?.suggestedAt && !yDay.state) || (isGuardian && !yDay?.state)) {
            days.push({ date: yesterday, label: `včera ${formatDateCs(yesterday)}` });
          }
          days.push({ date: today, label: 'dnes' });
          return (
            <div key={kid.id} className="space-y-2">
              {gameKids.length > 1 && (
                <p className="text-sm font-semibold" style={{ color: kid.color }}>
                  {kid.name}
                </p>
              )}
              {days.map(({ date, label }) => (
                <ChoreRow
                  key={date}
                  kid={kid}
                  date={date}
                  label={label}
                  day={dayFor(kid.id, date)}
                  isSelf={isSelf}
                  isGuardian={isGuardian}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ChoreRow({
  kid,
  date,
  label,
  day,
  isSelf,
  isGuardian,
}: {
  kid: Kid;
  date: string;
  label: string;
  day: ChoreDay | undefined;
  isSelf: boolean;
  isGuardian: boolean;
}) {
  const { member } = useAuth();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');
  const daily = kid.chores?.dailyAmount ?? 5;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      alert(`Akce se nepovedla: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  const status = day?.state ? (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        day.state === 'clean'
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-rose-100 text-rose-700'
      }`}
    >
      {day.state === 'clean' ? `✓ Uklizeno +${daily} Kč` : `✗ Neuklizeno −${daily} Kč`}
    </span>
  ) : day?.suggestedAt ? (
    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
      ⏳ Čeká na kontrolu
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
      zatím nic
    </span>
  );

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-slate-500">{label}</span>
        {status}
      </div>
      {day?.suggestedNote && !day.state && (
        <p className="mt-1 text-xs text-slate-500">💬 {day.suggestedNote}</p>
      )}
      {/* kid: report clean */}
      {isSelf && !day?.suggestedAt && !day?.state && (
        <div className="mt-2">
          {asking ? (
            <div className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Vzkaz (nepovinné)…"
                className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                autoFocus
              />
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await suggestClean(kid.id, date, note.trim());
                    setAsking(false);
                  })
                }
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Odeslat
              </button>
            </div>
          ) : (
            <button
              disabled={busy}
              onClick={() => setAsking(true)}
              className="w-full rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Mám uklizeno! 🧹
            </button>
          )}
        </div>
      )}
      {/* guardian: judge */}
      {isGuardian && member && !day?.state && (
        <div className="mt-2 flex gap-2">
          <button
            disabled={busy}
            onClick={() => run(() => reviewChoreDay(kid.id, date, 'clean', member))}
            className="flex-1 rounded-xl bg-confirmed px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            ✓ Uklizeno
          </button>
          <button
            disabled={busy}
            onClick={() => run(() => reviewChoreDay(kid.id, date, 'dirty', member))}
            className="flex-1 rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-600 disabled:opacity-50"
          >
            ✗ Neuklizeno
          </button>
        </div>
      )}
    </div>
  );
}
