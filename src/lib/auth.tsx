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

  useEffect(() => {
    if (!user) return;
    setMemberLoading(true);
    const unsub = onSnapshot(
      doc(db(), 'members', user.uid),
      (snap) => {
        setMember(snap.exists() ? ({ uid: snap.id, ...snap.data() } as Member) : null);
        setMemberLoading(false);
      },
      () => {
        setMember(null);
        setMemberLoading(false);
      },
    );
    return unsub;
  }, [user]);

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
