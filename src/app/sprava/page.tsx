'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { AdminGuard, btnPrimary } from '@/components/admin';
import { db } from '@/lib/firebase';

const SECTIONS = [
  { href: '/sprava/clenove/', label: 'Členové a pozvánky', icon: '👨‍👩‍👧‍👦' },
  { href: '/sprava/deti/', label: 'Děti a rozvrhy', icon: '🧒' },
  { href: '/sprava/udalosti/', label: 'Události', icon: '⭐' },
  { href: '/sprava/prazdniny/', label: 'Prázdniny a výjimky', icon: '🏖️' },
  { href: '/sprava/nastaveni/', label: 'Upozornění', icon: '🔔' },
];

const EXPORT_COLLECTIONS = ['kids', 'events', 'holidays', 'exceptions', 'settings'];

export default function AdminPage() {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function exportJson() {
    setBusy(true);
    try {
      const data: Record<string, Record<string, unknown>> = {};
      for (const coll of EXPORT_COLLECTIONS) {
        const snap = await getDocs(collection(db(), coll));
        data[coll] = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `deti-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setBusy(false);
    }
  }

  async function importJson(file: File) {
    setBusy(true);
    try {
      const data = JSON.parse(await file.text()) as Record<
        string,
        Record<string, Record<string, unknown>>
      >;
      const batch = writeBatch(db());
      let count = 0;
      for (const coll of EXPORT_COLLECTIONS) {
        for (const [id, docData] of Object.entries(data[coll] ?? {})) {
          batch.set(doc(db(), coll, id), docData, { merge: true });
          count++;
        }
      }
      await batch.commit();
      alert(`Import hotov: ${count} záznamů.`);
    } catch (e) {
      alert(`Import selhal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminGuard>
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Správa</h2>
        <div className="space-y-2">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm"
            >
              <span className="text-xl">{s.icon}</span>
              <span className="font-medium">{s.label}</span>
              <span className="ml-auto text-slate-300">→</span>
            </Link>
          ))}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-semibold">Záloha dat</h3>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => void exportJson()} className={btnPrimary}>
              Export JSON
            </button>
            <button
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
            >
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importJson(f);
                e.target.value = '';
              }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Exportuje děti, rozvrhy, události, prázdniny, výjimky a nastavení
            (ne členy ani historii).
          </p>
        </div>
      </div>
    </AdminGuard>
  );
}
