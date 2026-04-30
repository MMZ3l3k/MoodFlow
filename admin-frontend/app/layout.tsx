import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import SwRegister from '../components/SwRegister';
import Providers from '../components/Providers';

const montserrat = Montserrat({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MoodFlow Admin',
  description: 'Panel administracyjny MoodFlow',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MoodFlow Admin',
  },
  themeColor: '#C06226',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={montserrat.variable} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-admin-192.svg" />
      </head>
      <body className={montserrat.className}>
        <Providers>
          {children}
          <SwRegister />
        </Providers>
      </body>
    </html>
  );
}
