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
  onSubmit: (pin: string) => Promise<void>;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pin.length !== 4) {
      setError('יש להזין קוד בן 4 ספרות.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onSubmit(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הקוד אינו נכון.');
      setPin('');
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
          <label className="pinLabel">
            קוד כניסה
            <input
              className="pinInput"
              inputMode="numeric"
              autoComplete="one-time-code"
              type="password"
              placeholder="••••"
              maxLength={4}
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </label>
          <div className="pinDots" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <span key={index} className={pin.length > index ? 'filled' : ''} />
            ))}
          </div>
          {error && <div className="loginError">{error}</div>}
          <button className="primaryButton" type="submit" disabled={busy || pin.length !== 4}>
            {busy ? 'בודק…' : 'כניסה'}
          </button>
        </form>

        <Link className="loginBack" href="/e/demo-event">חזרה לאלבום</Link>
      </section>
    </main>
  );
}
