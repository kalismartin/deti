'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  addBonus,
  dismissCashout,
  payCashout,
  recordPayout,
  requestCashout,
  useAllChoreDays,
  useKids,
  usePocket,
} from '@/lib/data';
import { formatDateCs } from '@/lib/time';
import { IconBank } from '@/components/icons';
import {
  pocketBalance,
  type ChoreDay,
  type Kid,
  type PocketEntry,
} from '@/lib/types';

const czk = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)} Kč`;

const fmtDT = (ms: number) =>
  new Date(ms).toLocaleString('cs-CZ', {
    timeZone: 'Europe/Prague',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function BankaPage() {
  const kids = useKids();
  const choreDays = useAllChoreDays();
  const pocket = usePocket();

  if (!kids || !choreDays || !pocket) {
    return <p className="py-10 text-center text-slate-400">Načítám…</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <IconBank className="h-5 w-5 text-brand" /> Banka
      </h2>
      {kids.map((kid) => (
        <KidAccount
          key={kid.id}
          kid={kid}
          choreDays={choreDays.filter((d) => d.kidId === kid.id)}
          entries={pocket.filter((e) => e.kidId === kid.id)}
        />
      ))}
      <p className="text-center text-xs text-slate-400">
        Uklizený den +{kids[0]?.chores?.dailyAmount ?? 5} Kč · neuklizený −
        {kids[0]?.chores?.dailyAmount ?? 5} Kč · bez kontroly 0 Kč
      </p>
    </div>
  );
}

function KidAccount({
  kid,
  choreDays,
  entries,
}: {
  kid: Kid;
  choreDays: ChoreDay[];
  entries: PocketEntry[];
}) {
  const { member, isAdult } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<'cashout' | 'bonus' | 'payout' | null>(null);
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [showAll, setShowAll] = useState(false);

  if (!member) return null;
  const isSelf = member.kidId === kid.id;
  const isGuardian = kid.guardians?.includes(member.uid) ?? false;
  const balance = pocketBalance(kid, choreDays, entries);
  const daily = kid.chores?.dailyAmount ?? 5;
  const pending = entries.filter((e) => e.type === 'cashout' && e.status === 'requested');

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      setForm(null);
      setAmount('');
      setLabel('');
    } catch (e) {
      alert(`Akce se nepovedla: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  // merged ledger, newest first
  const rows: { key: string; at: number; icon: string; text: string; sub?: string; amount: number }[] = [
    ...choreDays
      .filter((d) => d.state)
      .map((d) => ({
        key: `c_${d.date}`,
        at: d.reviewedAt ?? 0,
        icon: d.state === 'clean' ? '🧹' : '🙈',
        text: d.state === 'clean' ? 'Uklizený pokojíček' : 'Neuklizený pokojíček',
        sub: `${formatDateCs(d.date)}${d.reviewedByName ? ` · ${d.reviewedByName}` : ''}`,
        amount: d.state === 'clean' ? daily : -daily,
      })),
    ...entries
      .filter((e) => e.type === 'bonus')
      .map((e) => ({
        key: e.id,
        at: e.createdAt,
        icon: '💰',
        text: e.label,
        sub: `${fmtDT(e.createdAt)} · ${e.createdByName}`,
        amount: e.amount,
      })),
    ...entries
      .filter((e) => e.type === 'cashout' && e.status === 'paid')
      .map((e) => ({
        key: e.id,
        at: e.paidAt ?? e.createdAt,
        icon: '💵',
        text: `Vyplaceno${e.label ? ` – ${e.label}` : ''}`,
        sub: `${fmtDT(e.paidAt ?? e.createdAt)} · ${e.paidByName ?? ''}`,
        amount: -e.amount,
      })),
  ].sort((a, b) => b.at - a.at);
  const visible = showAll ? rows : rows.slice(0, 8);

  return (
    <section
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5"
      style={{ borderTop: `4px solid ${kid.color}` }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{kid.name}</h3>
        <p
          className={`text-2xl font-extrabold tabular-nums ${
            balance < 0 ? 'text-rose-600' : 'text-emerald-600'
          }`}
        >
          {balance} Kč
        </p>
      </div>

      {/* pending cashout requests */}
      {pending.map((e) => (
        <div key={e.id} className="mt-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
          <p className="text-sm font-semibold">
            💸 Žádost o výplatu {e.amount} Kč
          </p>
          {e.label && <p className="text-xs text-slate-500">💬 {e.label}</p>}
          <p className="text-xs text-slate-400">{fmtDT(e.createdAt)}</p>
          {isGuardian && (
            <div className="mt-2 flex gap-2">
              <button
                disabled={busy}
                onClick={() => run(() => payCashout(e.id, member))}
                className="flex-1 rounded-lg bg-confirmed px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Vyplaceno 💵
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  if (confirm('Zamítnout žádost?')) void run(() => dismissCashout(e.id));
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
              >
                Zamítnout
              </button>
            </div>
          )}
          {isSelf && !isGuardian && (
            <button
              disabled={busy}
              onClick={() => run(() => dismissCashout(e.id))}
              className="mt-1 text-xs text-slate-400 underline"
            >
              vzít zpět
            </button>
          )}
        </div>
      ))}

      {/* actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        {isSelf && pending.length === 0 && (
          <button
            onClick={() => setForm(form === 'cashout' ? null : 'cashout')}
            className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white"
          >
            Chci vyplatit 💸
          </button>
        )}
        {isAdult && (
          <button
            onClick={() => setForm(form === 'bonus' ? null : 'bonus')}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            + Odměna
          </button>
        )}
        {isGuardian && (
          <button
            onClick={() => setForm(form === 'payout' ? null : 'payout')}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
          >
            Zapsat výplatu
          </button>
        )}
      </div>

      {form && (
        <div className="mt-2 space-y-2 rounded-xl bg-slate-50 p-3">
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Kolik Kč?"
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            autoFocus
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={
              form === 'cashout'
                ? 'Na co to je? (komentář)'
                : form === 'bonus'
                  ? 'Za co? (např. umyla auto)'
                  : 'Poznámka (např. koupili jsme lego)'
            }
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button
            disabled={busy || !amount || (form !== 'cashout' && !label.trim())}
            onClick={() => {
              const n = Number(amount);
              if (!Number.isFinite(n) || n === 0) return alert('Zadej částku.');
              if (form === 'cashout' && n > Math.max(balance, 0))
                return alert(`Tolik tam nemáš — max ${Math.max(balance, 0)} Kč.`);
              void run(() =>
                form === 'cashout'
                  ? requestCashout(kid.id, n, label.trim(), member)
                  : form === 'bonus'
                    ? addBonus(kid.id, n, label.trim(), member)
                    : recordPayout(kid.id, Math.abs(n), label.trim(), member),
              );
            }}
            className="w-full rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {form === 'cashout' ? 'Požádat o výplatu' : 'Uložit'}
          </button>
        </div>
      )}

      {/* ledger */}
      {rows.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
          {visible.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate">
                  {r.icon} {r.text}
                </p>
                {r.sub && <p className="text-xs text-slate-400">{r.sub}</p>}
              </div>
              <span
                className={`shrink-0 font-semibold tabular-nums ${
                  r.amount < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {czk(r.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > visible.length && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-1 w-full py-1 text-center text-xs text-brand underline"
        >
          zobrazit vše ({rows.length})
        </button>
      )}
    </section>
  );
}
