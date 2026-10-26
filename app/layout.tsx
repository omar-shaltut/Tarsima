import type {Metadata} from 'next';
import {getLocale} from 'next-intl/server';
import type {ReactNode} from 'react';
import {fraunces, newsreader, sourceSans} from '../src/ui/brand/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'TARSIMA — Shared Picks',
  description: 'Shared taste discovery backed by Qloo evidence and deterministic reconciliation.'
};

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${fraunces.variable} ${newsreader.variable} ${sourceSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
