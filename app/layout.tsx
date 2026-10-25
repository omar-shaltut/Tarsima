import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { fraunces, newsreader, sourceSans } from '../src/ui/brand/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'TARSIMA — Shared Picks',
  description: 'Shared taste discovery backed by Qloo evidence and deterministic reconciliation.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${newsreader.variable} ${sourceSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
