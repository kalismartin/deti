'use client';

import { useState } from 'react';
import {
  AdminGuard,
  AdminHeader,
  btnDanger,
  btnPrimary,
  Field,
  inputCls,
} from '@/components/admin';
import { removeDocIn, saveDocIn, useAllEvents, useKids } from '@/lib/data';
import { formatDateCs, pragueToday } from '@/lib/time';
import type { FamilyEvent } from '@/lib/types';

export default function EventsPage() {
  const kids = useKids();
  const events = useAllEvents();
  const [editing, setEditing] = useState<Partial<FamilyEvent> | null>(null);
  const [showPast, setShowPast] = useState(false);
  const today = pragueToday();

  const shown = (events ?? [])
    .filter((e) => showPast || e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? ''));

  const kidNames = (ids: string[]) =>
    ids.map((id) => kids?.find((k) => k.id === id)?.name ?? id).join(', ');

  return (
    <AdminGuard>
      <AdminHeader title="Události" />
      {editing ? (
        <EventForm event={editing} onDone={() => setEditing(null)} />
      ) : (
        <div className="space-y-2">
          {shown.map((e) => (
            <div key={e.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {e.title}
                    {e.pickupAt && (
                      <span className="ml-1 text-xs text-claimed">
                        vyzvednout ve {e.pickupAt}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateCs(e.date)}
                    {e.start ? ` · ${e.start}${e.end ? `–${e.end}` : ''}` : ''} ·{' '}
                    {kidNames(e.kidIds)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="text-brand underline" onClick={() => setEditing(e)}>
                    upravit
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => {
                      if (confirm(`Smazat událost „${e.title}“?`))
                        void removeDocIn('events', e.id);
                    }}
                  >
                    smazat
                  </button>
                </div>
              </div>
            </div>
          ))}
          {shown.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">Žádné události.</p>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setEditing({ date: today, kidIds: [] })}
              className={btnPrimary}
            >
              + Přidat událost
            </button>
            <button
              onClick={() => setShowPast(!showPast)}
              className="text-sm text-slate-400 underline"
            >
              {showPast ? 'skrýt minulé' : 'zobrazit minulé'}
            </button>
          </div>
        </div>
      )}
    </AdminGuard>
  );
}

function EventForm({
  event,
  onDone,
}: {
  event: Partial<FamilyEvent>;
  onDone: () => void;
}) {
  const kids = useKids();
  const [form, setForm] = useState<Partial<FamilyEvent>>({ ...event });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form.title?.trim() || !form.date || !(form.kidIds ?? []).length) {
      alert('Vyplň název, datum a alespoň jedno dítě.');
      return;
    }
    setBusy(true);
    try {
      await saveDocIn('events', form.id, {
        title: form.title.trim(),
        date: form.date,
        kidIds: form.kidIds,
        start: form.start ?? '',
        end: form.end ?? '',
        pickupAt: form.pickupAt ?? '',
      });
      onDone();
    } catch (e) {
      alert(`Uložení selhalo: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
      <Field label="Název">
        <input
          className={inputCls}
          value={form.title ?? ''}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="např. Plavání"
        />
      </Field>
      <Field label="Datum">
        <input
          type="date"
          className={inputCls}
          value={form.date ?? ''}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Od (nepovinné)">
          <input
            type="time"
            className={inputCls}
            value={form.start ?? ''}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
          />
        </Field>
        <Field label="Do (nepovinné)">
          <input
            type="time"
            className={inputCls}
            value={form.end ?? ''}
            onChange={(e) => setForm({ ...form, end: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Vyzvednout nejpozději v (nepovinné – zkracuje okno)">
        <input
          type="time"
          className={inputCls}
          value={form.pickupAt ?? ''}
          onChange={(e) => setForm({ ...form, pickupAt: e.target.value })}
        />
      </Field>
      <Field label="Děti">
        <div className="flex flex-wrap gap-2">
          {(kids ?? []).map((k) => {
            const selected = (form.kidIds ?? []).includes(k.id);
            return (
              <button
                key={k.id}
                onClick={() =>
                  setForm({
                    ...form,
                    kidIds: selected
                      ? (form.kidIds ?? []).filter((id) => id !== k.id)
                      : [...(form.kidIds ?? []), k.id],
                  })
                }
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  selected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {k.name}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => void save()} className={btnPrimary}>
          Uložit
        </button>
        <button onClick={onDone} className="px-4 py-2 text-sm text-slate-500 underline">
          Zrušit
        </button>
      </div>
    </div>
  );
}
