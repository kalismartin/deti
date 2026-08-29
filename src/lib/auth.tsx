'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import type { Member } from './types';

interface AuthState {
  user: User | null;
  member: Member | null;
  /** true while auth or member doc is still resolving */
  loading: boolean;
  isAdmin: boolean;
  /** admin or adult – may claim/confirm pickups */
  isAdult: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth(), (u) => {
      setUser(u);
      setAuthLoading(false);
      if (!u) setMember(null);
    });
  }, []);

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    setMemberLoading(true);
    let unsub: (() => void) | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const subscribe = () => {
      unsub = onSnapshot(
        doc(db(), 'members', uid),
        (snap) => {
          setMember(snap.exists() ? ({ uid: snap.id, ...snap.data() } as Member) : null);
          setMemberLoading(false);
        },
        () => {
          // An errored listener terminates for good. Right after sign-in this is
          // usually a race (auth token not yet on the stream) — show the doc as
          // missing but resubscribe to self-heal.
          setMember(null);
          setMemberLoading(false);
          if (!cancelled) retry = setTimeout(subscribe, 1500);
        },
      );
    };
    subscribe();
    return () => {
      cancelled = true;
      unsub?.();
      if (retry) clearTimeout(retry);
    };
  }, [uid]);

  const value: AuthState = {
    user,
    member,
    loading: authLoading || memberLoading,
    isAdmin: member?.role === 'admin',
    isAdult: member?.role === 'admin' || member?.role === 'adult',
    signIn: async () => {
      await signInWithPopup(auth(), googleProvider);
    },
    logOut: async () => {
      await signOut(auth());
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
