'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';

export default function InvitePage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-slate-400">Načítám…</p>}>
      <InviteInner />
    </Suspense>
  );
}

function InviteInner() {
  const { user, member, signIn } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function join() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await setDoc(doc(db(), 'members', user.uid), {
        name: user.displayName ?? user.email ?? 'Nový člen',
        email: user.email ?? '',
        role: 'unassigned',
        photoURL: user.photoURL ?? null,
        inviteToken: token,
      });
      router.push('/');
    } catch {
      setError('Pozvánka není platná nebo už byla zrušena.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="text-3xl font-bold text-brand">Děti</h1>
      {!token ? (
        <p className="text-slate-500">V odkazu chybí kód pozvánky.</p>
      ) : member ? (
        <>
          <p className="text-slate-500">Už jsi členem rodiny 🎉</p>
          <button onClick={() => router.push('/')} className="text-brand underline">
            Přejít do aplikace
          </button>
        </>
      ) : !user ? (
        <>
          <p className="text-slate-500">
            Byl(a) jsi pozván(a) do rodinné aplikace. Nejdřív se přihlas.
          </p>
          <button
            onClick={() => signIn().catch((e) => setError(String(e?.message ?? e)))}
            className="rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow"
          >
            Přihlásit se přes Google
          </button>
        </>
      ) : (
        <>
          <p className="text-slate-500">Přihlášen(a) jako {user.email}.</p>
          <button
            disabled={busy}
            onClick={() => void join()}
            className="rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow disabled:opacity-50"
          >
            Připojit se k rodině
          </button>
        </>
      )}
      {error && <p className="text-sm text-unclaimed">{error}</p>}
    </div>
  );
}
