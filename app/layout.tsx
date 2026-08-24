import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Moments — Event Photo Platform',
  description: 'Shared event photo platform — guest uploads, moderation and company back office.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
