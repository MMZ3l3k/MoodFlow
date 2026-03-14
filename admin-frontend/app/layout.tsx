import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MoodFlow Admin',
  description: 'Panel administracyjny MoodFlow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
