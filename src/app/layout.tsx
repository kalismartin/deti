import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

const nunito = Nunito({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: 'Děti',
  description: 'Rodinný rozvrh a vyzvedávání dětí',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Děti', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className={nunito.className}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
