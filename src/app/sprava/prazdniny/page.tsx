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
import { removeDocIn, saveDocIn, useExceptions, useHolidays, useKids } from '@/lib/data';
import { formatDateCs, pragueToday } from '@/lib/time';
import type { Holiday, ScheduleException } from '@/lib/types';

export default function HolidaysPage() {
  const kids = useKids();
  const holidays = useHolidays();
  const exceptions = useExceptions();
  const [editingHoliday, setEditingHoliday] = useState<Partial<Holiday> | null>(null);
  const [editingException, setEditingException] =
    useState<Partial<ScheduleException> | null>(null);

  const kidNames = (ids: string[]) =>
    ids.map((id) => kids?.find((k) => k.id === id)?.name ?? id).join(', ');

  if (editingHoliday)
    return (
      <AdminGuard>
        <AdminHeader title="Prázdniny" />
        <HolidayForm holiday={editingHoliday} onDone={() => setEditingHoliday(null)} />
      </AdminGuard>
    );

  if (editingException)
    return (
      <AdminGuard>
        <AdminHeader title="Výjimka" />
        <ExceptionForm
          exception={editingException}
          onDone={() => setEditingException(null)}
        />
      </AdminGuard>
    );

  return (
    <AdminGuard>
      <AdminHeader title="Prázdniny a výjimky" />
      <div className="space-y-4">
        <section>
          <h3 className="mb-2 font-semibold">Prázdniny</h3>
          <div className="space-y-2">
            {(holidays ?? [])
              .sort((a, b) => a.from.localeCompare(b.from))
              .map((h) => (
                <div key={h.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{h.label}</p>
                      <p className="text-xs text-slate-400">
                        {formatDateCs(h.from)} – {formatDateCs(h.to)} · {kidNames(h.kidIds)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        className="text-brand underline"
                        onClick={() => setEditingHoliday(h)}
                      >
                        upravit
                      </button>
                      <button
                        className={btnDanger}
                        onClick={() => {
                          if (confirm(`Smazat „${h.label}“?`))
                            void removeDocIn('holidays', h.id);
                        }}
                      >
                        smazat
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <button
            onClick={() => setEditingHoliday({ kidIds: [] })}
            className={`mt-2 ${btnPrimary}`}
          >
            + Přidat prázdniny
          </button>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Výjimky v rozvrhu</h3>
          <p className="mb-2 text-xs text-slate-400">
            Jednodenní změny: zavřeno, nebo jiné časy oken (zkrácený den, výlet…).
          </p>
          <div className="space-y-2">
            {(exceptions ?? [])
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((x) => (
                <div key={x.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{x.label}</p>
                      <p className="text-xs text-slate-400">
                        {formatDateCs(x.date)} · {kidNames([x.kidId])}
                        {x.closed ? ' · zavřeno' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        className="text-brand underline"
                        onClick={() => setEditingException(x)}
                      >
                        upravit
                      </button>
                      <button
                        className={btnDanger}
                        onClick={() => {
                          if (confirm(`Smazat výjimku „${x.label}“?`))
                            void removeDocIn('exceptions', x.id);
                        }}
                      >
                        smazat
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
          <button
            onClick={() => setEditingException({ date: pragueToday() })}
            className={`mt-2 ${btnPrimary}`}
          >
            + Přidat výjimku
          </button>
        </section>
      </div>
    </AdminGuard>
  );
}

function HolidayForm({
  holiday,
  onDone,
}: {
  holiday: Partial<Holiday>;
  onDone: () => void;
}) {
  const kids = useKids();
  const [form, setForm] = useState({ ...holiday });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form.label?.trim() || !form.from || !form.to || !(form.kidIds ?? []).length) {
      alert('Vyplň název, období a alespoň jedno dítě.');
      return;
    }
    setBusy(true);
    try {
      await saveDocIn('holidays', form.id, {
        label: form.label.trim(),
        from: form.from,
        to: form.to,
        kidIds: form.kidIds,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
      <Field label="Název">
        <input
          className={inputCls}
          value={form.label ?? ''}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="např. Podzimní prázdniny"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Od">
          <input
            type="date"
            className={inputCls}
            value={form.from ?? ''}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          />
        </Field>
        <Field label="Do (včetně)">
          <input
            type="date"
            className={inputCls}
            value={form.to ?? ''}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </Field>
      </div>
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

function ExceptionForm({
  exception,
  onDone,
}: {
  exception: Partial<ScheduleException>;
  onDone: () => void;
}) {
  const kids = useKids();
  const [form, setForm] = useState({ ...exception });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form.label?.trim() || !form.date || !form.kidId) {
      alert('Vyplň název, datum a dítě.');
      return;
    }
    setBusy(true);
    try {
      // drop empty time strings so they don't override the kid's regular windows
      const windows: ScheduleException['windows'] = {};
      for (const w of ['lunch', 'afternoon'] as const) {
        const o = form.windows?.[w];
        const cleaned = {
          ...(o?.start ? { start: o.start } : {}),
          ...(o?.end ? { end: o.end } : {}),
        };
        if (Object.keys(cleaned).length > 0)
          windows[w] = cleaned as { start: string; end: string };
      }
      await saveDocIn('exceptions', form.id, {
        label: form.label.trim(),
        date: form.date,
        kidId: form.kidId,
        closed: !!form.closed,
        windows,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
      <Field label="Název">
        <input
          className={inputCls}
          value={form.label ?? ''}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          placeholder="např. Zkrácený provoz"
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
      <Field label="Dítě">
        <select
          className={inputCls}
          value={form.kidId ?? ''}
          onChange={(e) => setForm({ ...form, kidId: e.target.value })}
        >
          <option value="">– vyber –</option>
          {(kids ?? []).map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!form.closed}
          onChange={(e) => setForm({ ...form, closed: e.target.checked })}
        />
        Zavřeno (žádné vyzvedávání)
      </label>
      {!form.closed &&
        (['lunch', 'afternoon'] as const).map((w) => (
          <fieldset key={w} className="rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-sm text-slate-600">
              Jiné časy: {w === 'lunch' ? 'Po obědě' : 'Odpoledne'} (nech prázdné = beze
              změny)
            </legend>
            <div className="flex items-center gap-2">
              <input
                type="time"
                className={inputCls}
                value={form.windows?.[w]?.start ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    windows: {
                      ...form.windows,
                      [w]: { ...form.windows?.[w], start: e.target.value },
                    },
                  })
                }
              />
              <span className="text-slate-400">–</span>
              <input
                type="time"
                className={inputCls}
                value={form.windows?.[w]?.end ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    windows: {
                      ...form.windows,
                      [w]: { ...form.windows?.[w], end: e.target.value },
                    },
                  })
                }
              />
            </div>
          </fieldset>
        ))}
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
