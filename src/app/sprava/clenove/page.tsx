'use client';

import { useState } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import {
  AdminGuard,
  AdminHeader,
  btnDanger,
  btnPrimary,
  inputCls,
} from '@/components/admin';
import { removeDocIn, useInvites, useMembers } from '@/lib/data';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import type { Role } from '@/lib/types';

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Správce',
  adult: 'Dospělý',
  child: 'Dítě',
  unassigned: 'Čeká na roli',
};

export default function MembersPage() {
  const { member: me } = useAuth();
  const members = useMembers();
  const invites = useInvites();
  const [busy, setBusy] = useState(false);
  const [inviteLabel, setInviteLabel] = useState('');

  async function setRole(uid: string, role: Role) {
    await updateDoc(doc(db(), 'members', uid), { role });
  }

  async function createInvite() {
    setBusy(true);
    try {
      const token = crypto.randomUUID().replaceAll('-', '');
      await setDoc(doc(db(), 'invites', token), {
        createdBy: me?.uid ?? '',
        createdAt: Date.now(),
        active: true,
        label: inviteLabel.trim() || 'Pozvánka',
      });
      setInviteLabel('');
    } finally {
      setBusy(false);
    }
  }

  function inviteUrl(token: string) {
    return `${location.origin}/pozvanka/?token=${token}`;
  }

  return (
    <AdminGuard>
      <AdminHeader title="Členové a pozvánky" />
      <div className="space-y-4">
        <div className="space-y-2">
          {(members ?? []).map((m) => (
            <div key={m.uid} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {m.name}
                    {m.uid === me?.uid && (
                      <span className="ml-1 text-xs text-slate-400">(ty)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-400">{m.email}</p>
                </div>
                <select
                  value={m.role}
                  disabled={m.uid === me?.uid}
                  onChange={(e) => void setRole(m.uid, e.target.value as Role)}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                >
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              {m.uid !== me?.uid && (
                <button
                  className={`mt-1 ${btnDanger}`}
                  onClick={() => {
                    if (confirm(`Odebrat člena ${m.name}?`))
                      void removeDocIn('members', m.uid);
                  }}
                >
                  odebrat
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-2 font-semibold">Pozvánky</h3>
          <div className="mb-3 flex gap-2">
            <input
              value={inviteLabel}
              onChange={(e) => setInviteLabel(e.target.value)}
              placeholder="Popisek (např. Babička)"
              className={inputCls}
            />
            <button disabled={busy} onClick={() => void createInvite()} className={btnPrimary}>
              Vytvořit
            </button>
          </div>
          <div className="space-y-2">
            {(invites ?? [])
              .filter((i) => i.active)
              .map((i) => (
                <div
                  key={i.token}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2 text-sm"
                >
                  <span className="truncate">{i.label ?? 'Pozvánka'}</span>
                  <div className="flex shrink-0 gap-2">
                    <button
                      className="text-brand underline"
                      onClick={() => {
                        void navigator.clipboard.writeText(inviteUrl(i.token));
                        alert('Odkaz zkopírován. Pošli ho pozvanému.');
                      }}
                    >
                      kopírovat odkaz
                    </button>
                    <button
                      className={btnDanger}
                      onClick={() => void removeDocIn('invites', i.token)}
                    >
                      zrušit
                    </button>
                  </div>
                </div>
              ))}
            {(invites ?? []).filter((i) => i.active).length === 0 && (
              <p className="text-sm text-slate-400">Žádné aktivní pozvánky.</p>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
