import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Digi — האירוע שלכם, דרך העיניים של כולם',
  description: 'אלבום אירוע משותף עם העלאה מהירה, אישור תמונות ו־QR/NFC.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
