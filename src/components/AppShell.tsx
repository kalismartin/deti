'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { sharingPreferred, startSharing, stopSharing } from '@/lib/location';
import { refreshPushToken } from '@/lib/messaging';

const NAV = [
  { href: '/', label: 'Dnes', icon: '🏠' },
  { href: '/tyden/', label: 'Týden', icon: '📅' },
  { href: '/banka/', label: 'Banka', icon: '🏦' },
  { href: '/historie/', label: 'Historie', icon: '📖' },
  { href: '/sprava/', label: 'Správa', icon: '⚙️', adminOnly: true },
];

const LEGACY_HOSTS = ['deti-mk.web.app', 'deti-mk.firebaseapp.com'];
const CANONICAL_ORIGIN = 'https://deti.martinkalis.com';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, member, loading, isAdmin } = useAuth();
  const pathname = usePathname();

  // legacy hosting domains → custom domain; a second origin would otherwise
  // register its own push subscription and every alert would arrive twice
  useEffect(() => {
    if (LEGACY_HOSTS.includes(window.location.hostname)) {
      window.location.replace(
        `${CANONICAL_ORIGIN}${window.location.pathname}${window.location.search}`,
      );
    }
  }, []);

  // child accounts keep sharing location while the app is open (if enabled)
  const isChild = member?.role === 'child';
  const childUid = isChild ? member?.uid : undefined;
  useEffect(() => {
    if (!childUid || !sharingPreferred()) return;
    startSharing(childUid);
    return stopSharing;
  }, [childUid]);

  // FCM tokens rotate — silently re-register on app open so push keeps working
  const memberUid = member?.uid;
  useEffect(() => {
    if (!memberUid || LEGACY_HOSTS.includes(window.location.hostname)) return;
    void refreshPushToken(memberUid);
  }, [memberUid]);

  // the invite page manages its own auth flow
  if (pathname.startsWith('/pozvanka')) return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-400">
        Načítám…
      </div>
    );
  }

  if (!user) return <LoginScreen />;
  if (!member) return <NoMemberScreen />;
  if (member.role === 'unassigned') return <WaitingScreen />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-900/5 bg-white/80 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-extrabold tracking-tight text-brand">Děti</h1>
          <div className="flex items-center gap-3">
            <PushBell />
            <UserBadge />
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 pt-4 pb-28">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-900/5 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-lg px-1 py-1">
          {NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`mx-0.5 flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] transition-colors ${
                pathname === n.href
                  ? 'bg-brand/10 font-semibold text-brand'
                  : 'text-slate-500'
              }`}
            >
              <span className="text-lg leading-none">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

/** Bell for members to enable push notifications on this device. */
function PushBell() {
  const { member } = useAuth();
  const [enabled, setEnabled] = useState(
    typeof window !== 'undefined' && !!localStorage.getItem('fcmToken'),
  );
  useEffect(() => {
    const sync = () => {
      try {
        setEnabled(!!localStorage.getItem('fcmToken'));
      } catch {}
    };
    window.addEventListener('fcm-changed', sync);
    return () => window.removeEventListener('fcm-changed', sync);
  }, []);
  if (!member) return null;
  return (
    <button
      title={enabled ? 'Notifikace zapnuty' : 'Zapnout notifikace'}
      onClick={async () => {
        const { enablePush } = await import('@/lib/messaging');
        const err = await enablePush(member.uid);
        if (err) alert(err);
        else {
          setEnabled(true);
          alert('Notifikace na tomto zařízení zapnuty.');
        }
      }}
      className={enabled ? '' : 'opacity-40'}
    >
      🔔
    </button>
  );
}

function UserBadge() {
  const { member, logOut } = useAuth();
  return (
    <button
      onClick={() => {
        if (confirm('Odhlásit se?')) void logOut();
      }}
      className="flex items-center gap-2 text-sm text-slate-600"
    >
      <span>{member?.name}</span>
      {member?.photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.photoURL} alt="" className="h-7 w-7 rounded-full" />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">
          {member?.name?.[0] ?? '?'}
        </span>
      )}
    </button>
  );
}

function LoginScreen() {
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-4xl font-bold text-brand">Děti</h1>
        <p className="mt-2 text-slate-500">Rodinný rozvrh a vyzvedávání</p>
      </div>
      <button
        onClick={() => signIn().catch((e) => setError(String(e?.message ?? e)))}
        className="rounded-xl bg-brand px-6 py-3 font-semibold text-white shadow"
      >
        Přihlásit se přes Google
      </button>
      {error && <p className="text-sm text-unclaimed">{error}</p>}
    </div>
  );
}

/** Signed in with Google but no member document: needs invite (or owner bootstrap). */
function NoMemberScreen() {
  const { user, logOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function becomeAdmin() {
    if (!user) return;
    try {
      await setDoc(doc(db(), 'members', user.uid), {
        name: user.displayName ?? user.email ?? 'Správce',
        email: user.email ?? '',
        role: 'admin',
        photoURL: user.photoURL ?? null,
      });
    } catch {
      setError(
        'Tvůj účet nemá oprávnění správce. Požádej rodiče o pozvánku (odkaz).',
      );
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Vítej v aplikaci Děti</h1>
      <p className="text-slate-500">
        Pro vstup potřebuješ pozvánku. Požádej rodiče o odkaz s pozvánkou a otevři
        ho na tomto zařízení.
      </p>
      <button onClick={becomeAdmin} className="text-sm text-brand underline">
        Jsem vlastník rodiny – stát se správcem
      </button>
      {error && <p className="text-sm text-unclaimed">{error}</p>}
      <button onClick={() => void logOut()} className="text-sm text-slate-400 underline">
        Odhlásit se
      </button>
    </div>
  );
}

function WaitingScreen() {
  const { logOut } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Čeká se na schválení</h1>
      <p className="text-slate-500">
        Správce rodiny ti musí přiřadit roli. Řekni si rodičům 🙂
      </p>
      <button onClick={() => void logOut()} className="text-sm text-slate-400 underline">
        Odhlásit se
      </button>
    </div>
  );
}
