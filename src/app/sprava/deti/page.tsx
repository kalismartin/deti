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
import { removeDocIn, saveDocIn, useKids } from '@/lib/data';
import type { Kid, Lesson } from '@/lib/types';
import { WEEKDAY_NAMES_CS } from '@/lib/time';

const EMPTY: Omit<Kid, 'id'> = {
  name: '',
  type: 'preschool',
  className: '',
  color: '#2563eb',
  arrival: { start: '07:30', end: '08:45' },
  windows: {
    lunch: { start: '12:40', end: '13:00', label: 'Po obědě' },
    afternoon: { start: '15:00', end: '17:45', label: 'Odpoledne' },
  },
  hourSchedule: {},
  order: 0,
};

function lessonsToText(lessons: Lesson[] | undefined): string {
  return (lessons ?? [])
    .map((l) => `${l.start}-${l.end} ${l.subject}`)
    .join('\n');
}

function textToLessons(text: string): Lesson[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const m = line.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s+(.+)$/);
      return m ? [{ start: m[1].padStart(5, '0'), end: m[2].padStart(5, '0'), subject: m[3] }] : [];
    });
}

export default function KidsPage() {
  const kids = useKids();
  const [editing, setEditing] = useState<Kid | (Omit<Kid, 'id'> & { id?: string }) | null>(
    null,
  );

  return (
    <AdminGuard>
      <AdminHeader title="Děti a rozvrhy" />
      {editing ? (
        <KidForm
          kid={editing}
          onDone={() => setEditing(null)}
          nextOrder={(kids?.length ?? 0) + 1}
        />
      ) : (
        <div className="space-y-2">
          {(kids ?? []).map((k) => (
            <div key={k.id} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ color: k.color }}>
                    {k.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {k.type === 'school' ? 'Škola' : 'Školka'}
                    {k.className ? ` · ${k.className}` : ''}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button className="text-sm text-brand underline" onClick={() => setEditing(k)}>
                    upravit
                  </button>
                  <button
                    className={btnDanger}
                    onClick={() => {
                      if (confirm(`Smazat dítě ${k.name}?`)) void removeDocIn('kids', k.id);
                    }}
                  >
                    smazat
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button onClick={() => setEditing({ ...EMPTY })} className={btnPrimary}>
            + Přidat dítě
          </button>
        </div>
      )}
    </AdminGuard>
  );
}

function KidForm({
  kid,
  onDone,
  nextOrder,
}: {
  kid: Kid | (Omit<Kid, 'id'> & { id?: string });
  onDone: () => void;
  nextOrder: number;
}) {
  const [form, setForm] = useState({ ...kid });
  const [scheduleTexts, setScheduleTexts] = useState<Record<string, string>>(
    Object.fromEntries(
      [1, 2, 3, 4, 5].map((d) => [String(d), lessonsToText(kid.hourSchedule?.[String(d)])]),
    ),
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form.name.trim()) {
      alert('Vyplň jméno.');
      return;
    }
    setBusy(true);
    try {
      const hourSchedule =
        form.type === 'school'
          ? Object.fromEntries(
              Object.entries(scheduleTexts)
                .map(([d, t]) => [d, textToLessons(t)] as const)
                .filter(([, lessons]) => lessons.length > 0),
            )
          : {};
      await saveDocIn('kids', 'id' in form ? form.id : undefined, {
        name: form.name.trim(),
        type: form.type,
        className: form.className ?? '',
        color: form.color,
        arrival: form.arrival ?? null,
        windows: form.windows,
        hourSchedule,
        order: form.order || nextOrder,
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
      <Field label="Jméno">
        <input
          className={inputCls}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Typ">
          <select
            className={inputCls}
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as Kid['type'] })
            }
          >
            <option value="preschool">Školka</option>
            <option value="school">Škola</option>
          </select>
        </Field>
        <Field label="Třída">
          <input
            className={inputCls}
            value={form.className ?? ''}
            onChange={(e) => setForm({ ...form, className: e.target.value })}
            placeholder="např. Ptáčci a Butterflies"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Barva">
          <input
            type="color"
            className="h-10 w-full rounded-lg border border-slate-300"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
          />
        </Field>
        <Field label="Pořadí">
          <input
            type="number"
            className={inputCls}
            value={form.order || nextOrder}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
          />
        </Field>
      </div>

      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium text-slate-600">
          Příchod (jen informativní)
        </legend>
        <TimeRange
          value={form.arrival ?? { start: '', end: '' }}
          onChange={(v) => setForm({ ...form, arrival: v })}
        />
      </fieldset>

      {(['lunch', 'afternoon'] as const).map((w) => (
        <fieldset key={w} className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-600">
            Okno: {w === 'lunch' ? 'Po obědě' : 'Odpoledne'}
          </legend>
          <TimeRange
            value={form.windows[w]}
            onChange={(v) =>
              setForm({
                ...form,
                windows: { ...form.windows, [w]: { ...form.windows[w], ...v } },
              })
            }
          />
        </fieldset>
      ))}

      {form.type === 'school' && (
        <fieldset className="rounded-lg border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-600">
            Rozvrh hodin (řádek: 08:00-08:45 Předmět)
          </legend>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((d) => (
              <Field key={d} label={WEEKDAY_NAMES_CS[d]}>
                <textarea
                  rows={3}
                  className={inputCls}
                  value={scheduleTexts[String(d)]}
                  onChange={(e) =>
                    setScheduleTexts({ ...scheduleTexts, [String(d)]: e.target.value })
                  }
                />
              </Field>
            ))}
          </div>
        </fieldset>
      )}

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

function TimeRange({
  value,
  onChange,
}: {
  value: { start: string; end: string };
  onChange: (v: { start: string; end: string }) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="time"
        className={inputCls}
        value={value.start}
        onChange={(e) => onChange({ ...value, start: e.target.value })}
      />
      <span className="text-slate-400">–</span>
      <input
        type="time"
        className={inputCls}
        value={value.end}
        onChange={(e) => onChange({ ...value, end: e.target.value })}
      />
    </div>
  );
}
