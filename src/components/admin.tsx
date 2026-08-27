'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <p className="py-10 text-center text-slate-400">
        Tato sekce je jen pro správce.
      </p>
    );
  }
  return <>{children}</>;
}

export function AdminHeader({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Link href="/sprava/" className="text-xl text-slate-400">
        ←
      </Link>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm bg-white';

export const btnPrimary =
  'rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';

export const btnDanger = 'text-sm text-unclaimed underline';
