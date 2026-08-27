'use client';

import { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import {
  AdminGuard,
  AdminHeader,
  btnPrimary,
  Field,
  inputCls,
} from '@/components/admin';
import { useAlertSettings } from '@/lib/data';
import { db } from '@/lib/firebase';
import type { AlertSettings } from '@/lib/types';

export default function SettingsPage() {
  const settings = useAlertSettings();
  const [form, setForm] = useState<AlertSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  async function save() {
    if (!form) return;
    setBusy(true);
    try {
      await setDoc(doc(db(), 'settings', 'alerts'), form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  if (!form) {
    return (
      <AdminGuard>
        <AdminHeader title="Upozornění" />
        <p className="py-10 text-center text-slate-400">Načítám…</p>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <AdminHeader title="Upozornění" />
      <div className="space-y-3">
        <AlertCard
          title="1. Nikdo nevyzvedává – ranní upozornění"
          desc="Všem dospělým, pokud v tento čas nikdo nemá zamluvené dnešní vyzvednutí."
          enabled={form.unclaimedEnabled}
          onToggle={(v) => setForm({ ...form, unclaimedEnabled: v })}
        >
          <Field label="Čas">
            <input
              type="time"
              className={inputCls}
              value={form.unclaimedAt}
              onChange={(e) => setForm({ ...form, unclaimedAt: e.target.value })}
            />
          </Field>
        </AlertCard>

        <AlertCard
          title="2. Nikdo nevyzvedává – urgentní"
          desc="Všem dospělým, pokud stále nikdo nevyzvedává krátce před začátkem okna."
          enabled={form.urgentEnabled}
          onToggle={(v) => setForm({ ...form, urgentEnabled: v })}
        >
          <Field label="Minut před začátkem okna">
            <input
              type="number"
              className={inputCls}
              value={form.urgentBeforeMin}
              onChange={(e) =>
                setForm({ ...form, urgentBeforeMin: Number(e.target.value) })
              }
            />
          </Field>
        </AlertCard>

        <AlertCard
          title="3. Nepotvrzené vyzvednutí"
          desc="Všem dospělým na konci okna, pokud vyzvednutí nebylo potvrzeno."
          enabled={form.endOfWindowEnabled}
          onToggle={(v) => setForm({ ...form, endOfWindowEnabled: v })}
        />

        <AlertCard
          title="4. Připomínka tomu, kdo vyzvedává"
          desc="Tichá připomínka jen tomu, kdo má vyzvednutí zamluvené."
          enabled={form.nudgeEnabled}
          onToggle={(v) => setForm({ ...form, nudgeEnabled: v })}
        >
          <Field label="Minut před vyzvednutím">
            <input
              type="number"
              className={inputCls}
              value={form.nudgeBeforeMin}
              onChange={(e) =>
                setForm({ ...form, nudgeBeforeMin: Number(e.target.value) })
              }
            />
          </Field>
        </AlertCard>

        <div className="flex items-center gap-3">
          <button disabled={busy} onClick={() => void save()} className={btnPrimary}>
            Uložit
          </button>
          {saved && <span className="text-sm text-confirmed">Uloženo ✓</span>}
        </div>
      </div>
    </AdminGuard>
  );
}

function AlertCard({
  title,
  desc,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  desc: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <label className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-xs text-slate-400">{desc}</p>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 h-5 w-5"
        />
      </label>
      {enabled && children && <div className="mt-3">{children}</div>}
    </div>
  );
}
