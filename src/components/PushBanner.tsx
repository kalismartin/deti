'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { enablePush } from '@/lib/messaging';

type Mode = 'hidden' | 'ask' | 'denied' | 'install';

/**
 * Prominent prompt on the main page pushing every member to enable
 * notifications. Disappears only once push is registered on this device.
 */
export function PushBanner() {
  const { member } = useAuth();
  const [mode, setMode] = useState<Mode>('hidden');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      if (!member) {
        setMode('hidden');
        return;
      }
      if (typeof Notification === 'undefined') {
        const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
        const standalone = window.matchMedia('(display-mode: standalone)').matches;
        setMode(ios && !standalone ? 'install' : 'hidden');
        return;
      }
      if (Notification.permission === 'denied') {
        setMode('denied');
        return;
      }
      let hasToken = false;
      try {
        hasToken = !!localStorage.getItem('fcmToken');
      } catch {}
      setMode(Notification.permission === 'granted' && hasToken ? 'hidden' : 'ask');
    };
    update();
    window.addEventListener('fcm-changed', update);
    return () => window.removeEventListener('fcm-changed', update);
  }, [member]);

  if (mode === 'hidden') return null;

  return (
    <section className="rounded-2xl border-2 border-brand/40 bg-white p-4 shadow-sm">
      <h2 className="font-bold">🔔 Zapni si upozornění</h2>
      {mode === 'ask' && (
        <>
          <p className="mt-1 text-sm text-slate-500">
            Bez nich se nedozvíš, když nikdo nevyzvedává nebo když někdo vyzvednutí
            zruší.
          </p>
          <button
            disabled={busy}
            onClick={async () => {
              if (!member) return;
              setBusy(true);
              setError(null);
              const err = await enablePush(member.uid);
              setBusy(false);
              if (err) setError(err);
            }}
            className="mt-3 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Zapnout upozornění
          </button>
          {error && <p className="mt-2 text-sm text-unclaimed">{error}</p>}
        </>
      )}
      {mode === 'install' && (
        <p className="mt-1 text-sm text-slate-500">
          Na iPhonu nejdřív přidej aplikaci na plochu: <strong>Sdílet</strong> →{' '}
          <strong>Přidat na plochu</strong>. Pak ji otevři z plochy a upozornění
          zapneš tady.
        </p>
      )}
      {mode === 'denied' && (
        <p className="mt-1 text-sm text-slate-500">
          Notifikace jsou v prohlížeči zablokované. Povol je v nastavení stránky
          (ikona zámku vedle adresy) a obnov stránku.
        </p>
      )}
    </section>
  );
}
