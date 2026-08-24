'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function StaffLogin({
  title,
  subtitle,
  roleLabel,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  roleLabel: string;
  onSubmit: (phone: string, pin: string) => Promise<void>;
}) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!phone.trim() || pin.length < 4) {
      setError('יש להזין מספר טלפון וקוד אישי.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onSubmit(phone, pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא הצלחנו להתחבר.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="loginPage">
      <section className="loginCard">
        <Logo />
        <span className="loginRole">{roleLabel}</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <form onSubmit={submit}>
          <label>
            מספר טלפון
            <input
              inputMode="tel"
              autoComplete="tel"
              placeholder="05X-XXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label>
            קוד אישי
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              type="password"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            />
          </label>
          {error && <div className="loginError">{error}</div>}
          <button className="primaryButton" type="submit" disabled={busy}>
            {busy ? 'מתחבר…' : 'כניסה למערכת'}
          </button>
        </form>
        <div className="demoHint">
          v0.2 · הכניסה נבדקת מול Supabase. חשבונות הבדיקה מוגדרים בבסיס הנתונים.
        </div>
        <Link className="loginBack" href="/">← חזרה לעמוד הראשי</Link>
      </section>
    </main>
  );
}
