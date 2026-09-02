'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  claimPickup,
  confirmPickup,
  setDayNote,
  unclaimPickup,
  unconfirmPickup,
} from '@/lib/data';
import type { ResolvedDay } from '@/lib/schedule';
import type { Member, WindowKey } from '@/lib/types';
import { WINDOW_LABELS } from '@/lib/types';
import { isoWeekday } from '@/lib/time';

const STATE_STYLES: Record<string, { badge: string; label: string; ring: string }> = {
  rest: { badge: 'bg-slate-200 text-slate-600', label: 'Volno', ring: 'ring-slate-200' },
  unclaimed: { badge: 'bg-unclaimed text-white', label: 'Nikdo nevyzvedává!', ring: 'ring-unclaimed/40' },
  claimed: { badge: 'bg-claimed text-white', label: 'Zamluveno', ring: 'ring-claimed/40' },
  confirmed: { badge: 'bg-confirmed text-white', label: 'Vyzvednuto', ring: 'ring-confirmed/40' },
};

export function KidDayCard({
  resolved,
  adults,
}: {
  resolved: ResolvedDay;
  adults: Member[];
}) {
  const { member, isAdult } = useAuth();
  const { kid, date, state, day, events } = resolved;
  const style = STATE_STYLES[state];
  const [busy, setBusy] = useState(false);
  const [confirmFor, setConfirmFor] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(day?.note ?? '');

  const lessons = kid.hourSchedule?.[String(isoWeekday(date))] ?? [];

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

  return (
    <section
      className={`rounded-2xl bg-white p-4 shadow-sm ring-2 ${style.ring}`}
      style={{ borderTop: `4px solid ${kid.color}` }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">{kid.name}</h2>
          {kid.className && <p className="text-xs text-slate-400">{kid.className}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}>
          {state === 'rest' ? resolved.restReason ?? 'Volno' : style.label}
        </span>
      </div>

      {/* timeline */}
      <div className="mt-3 space-y-1 text-sm">
        {kid.arrival && state !== 'rest' && (
          <Row icon="🌅" text={`Příchod ${kid.arrival.start} – ${kid.arrival.end}`} />
        )}
        {lessons.length > 0 && state !== 'rest' && (
          <Row
            icon="🏫"
            text={`Vyučování ${lessons[0].start} – ${lessons[lessons.length - 1].end}`}
          />
        )}
        {events.map((e) => (
          <Row
            key={e.id}
            icon="⭐"
            text={`${e.title}${e.start ? ` ${e.start}${e.end ? `–${e.end}` : ''}` : ''}${
              e.pickupAt ? ` (vyzvednout ve ${e.pickupAt})` : ''
            }`}
          />
        ))}
        {state !== 'rest' && (
          <Row
            icon="🚸"
            text={
              day?.window
                ? `Vyzvednutí: ${WINDOW_LABELS[day.window]} (${resolved.windows[day.window].start} – ${resolved.windows[day.window].end}${resolved.pickupAt ? `, kvůli akci do ${resolved.pickupAt}` : ''})`
                : `Okna: ${resolved.windows.lunch.start}–${resolved.windows.lunch.end} / ${resolved.windows.afternoon.start}–${resolved.windows.afternoon.end}`
            }
          />
        )}
      </div>

      {/* pickup status + actions */}
      {state !== 'rest' && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {state === 'unclaimed' && isAdult && member && (
            <div>
              <p className="mb-2 text-sm font-medium">Vyzvednu:</p>
              <div className="flex gap-2">
                {(['lunch', 'afternoon'] as WindowKey[]).map((w) => (
                  <button
                    key={w}
                    disabled={busy}
                    onClick={() => run(() => claimPickup(kid.id, date, w, member))}
                    className="flex-1 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {WINDOW_LABELS[w]}
                    <span className="block text-xs font-normal opacity-80">
                      {resolved.windows[w].start} – {resolved.windows[w].end}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {state === 'claimed' && day && (
            <div className="space-y-2">
              <p className="text-sm">
                Vyzvedává <strong>{day.claimedByName}</strong> (
                {WINDOW_LABELS[day.window ?? 'afternoon']})
              </p>
              {isAdult && member && (
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        confirmPickup(kid.id, date, member, {
                          uid: day.claimedBy!,
                          name: day.claimedByName ?? '?',
                        }),
                      )
                    }
                    className="flex-1 rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Potvrdit vyzvednutí
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => setConfirmFor(!confirmFor)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    Vyzvedl někdo jiný…
                  </button>
                  {day.claimedBy === member.uid ? (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (confirm('Zrušit své vyzvednutí? Všem přijde upozornění.'))
                          void run(() => unclaimPickup(kid.id, date));
                      }}
                      className="rounded-xl border border-unclaimed/40 px-3 py-2 text-sm text-unclaimed"
                    >
                      Zrušit
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`Převzít vyzvednutí od: ${day.claimedByName}?`))
                          void run(() =>
                            claimPickup(kid.id, date, day.window ?? 'afternoon', member),
                          );
                      }}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    >
                      Beru to já
                    </button>
                  )}
                </div>
              )}
              {confirmFor && member && (
                <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 p-2">
                  {adults.map((a) => (
                    <button
                      key={a.uid}
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await confirmPickup(kid.id, date, member, {
                            uid: a.uid,
                            name: a.name,
                          });
                          setConfirmFor(false);
                        })
                      }
                      className="rounded-lg bg-white px-3 py-1.5 text-sm shadow-sm"
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {state === 'confirmed' && day && (
            <div className="flex items-center justify-between text-sm">
              <p>
                ✅ Vyzvedl(a) <strong>{day.pickedUpByName}</strong>
                {day.confirmedBy !== day.pickedUpBy && day.confirmedByName
                  ? ` (potvrdil(a) ${day.confirmedByName})`
                  : ''}
              </p>
              {isAdult && (
                <button
                  disabled={busy}
                  onClick={() => {
                    if (confirm('Zrušit potvrzení vyzvednutí?'))
                      void run(() => unconfirmPickup(kid.id, date));
                  }}
                  className="text-xs text-slate-400 underline"
                >
                  vrátit
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* day note */}
      <div className="mt-3 border-t border-slate-100 pt-2 text-sm">
        {editingNote && isAdult ? (
          <div className="flex gap-2">
            <input
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Poznámka ke dni…"
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5"
              autoFocus
            />
            <button
              onClick={() =>
                run(async () => {
                  await setDayNote(kid.id, date, noteDraft.trim());
                  setEditingNote(false);
                })
              }
              className="rounded-lg bg-brand px-3 py-1.5 text-white"
            >
              OK
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (isAdult) {
                setNoteDraft(day?.note ?? '');
                setEditingNote(true);
              }
            }}
            className="text-left text-slate-500"
          >
            📝 {day?.note ? day.note : isAdult ? 'Přidat poznámku…' : '—'}
          </button>
        )}
      </div>
    </section>
  );
}

function Row({ icon, text }: { icon: string; text: string }) {
  return (
    <p className="flex items-start gap-2 text-slate-600">
      <span>{icon}</span>
      <span>{text}</span>
    </p>
  );
}
