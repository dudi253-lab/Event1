'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function MockPhoneLogin({
  title,
  subtitle,
  roleLabel,
  onSuccess,
}: {
  title: string;
  subtitle: string;
  roleLabel: string;
  onSuccess: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9 || pin.length < 4) {
      setError('בדמו יש להזין מספר טלפון וקוד אישי של לפחות 4 ספרות.');
      return;
    }
    setError('');
    onSuccess();
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
            <input inputMode="tel" placeholder="05X-XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label>
            קוד אישי
            <input inputMode="numeric" type="password" placeholder="••••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} />
          </label>
          {error && <div className="loginError">{error}</div>}
          <button className="primaryButton" type="submit">כניסה למערכת</button>
        </form>
        <div className="demoHint">Starter v0.1 — ההתחברות כרגע מדומה. בשלב Backend הבדיקה תתבצע בצד השרת מול הרשאות האירוע.</div>
        <Link className="loginBack" href="/">← חזרה לבחירת ממשק</Link>
      </section>
    </main>
  );
}
