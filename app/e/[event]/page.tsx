'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { demoEvent, gallery } from '@/lib/mock-data';

export default function GuestEventPage() {
  const [view, setView] = useState<'home' | 'upload' | 'success' | 'album'>('home');
  const [selected, setSelected] = useState(0);
  const title = useMemo(() => demoEvent.name, []);

  const onFiles = (files: FileList | null) => {
    setSelected(files?.length ?? 0);
    if (files?.length) setView('upload');
  };

  if (view === 'album') {
    return (
      <main className="guestShell guestAlbum">
        <header className="guestTopbar">
          <button className="iconButton" onClick={() => setView('home')} aria-label="חזרה">→</button>
          <div><strong>{title}</strong><span>האלבום המשותף</span></div>
          <Link className="iconButton" href="/" aria-label="בחירת ממשק">⌂</Link>
        </header>
        <div className="albumIntro">
          <span className="softBadge">✓ 142 תמונות מאושרות</span>
          <h1>הערב דרך העיניים שלכם</h1>
          <p>רק תמונות שאושרו מופיעות כאן.</p>
        </div>
        <div className="masonryGrid">
          {gallery.map((src, i) => <img key={src} src={src} alt={`תמונת אירוע ${i + 1}`} />)}
        </div>
        <button className="stickyUpload" onClick={() => setView('home')}>＋ העלו עוד תמונות</button>
      </main>
    );
  }

  if (view === 'success') {
    return (
      <main className="guestShell centeredGuest">
        <div className="successOrb">✓</div>
        <span className="eyebrow">העלאה הושלמה</span>
        <h1>קיבלנו! ❤️</h1>
        <p>{selected || 6} התמונות שלכם נשמרו וממתינות לאישור לפני שיופיעו באלבום.</p>
        <button className="primaryButton" onClick={() => { setSelected(0); setView('home'); }}>📸 להעלות עוד</button>
        <button className="secondaryButton" onClick={() => setView('album')}>✨ לראות את האלבום</button>
      </main>
    );
  }

  if (view === 'upload') {
    return (
      <main className="guestShell uploadScreen">
        <header className="guestTopbar">
          <button className="iconButton" onClick={() => setView('home')}>→</button>
          <strong>העלאת תמונות</strong>
          <span />
        </header>
        <section className="uploadBody">
          <span className="eyebrow">בחרתם {selected} תמונות</span>
          <h1>הכול מוכן להעלאה</h1>
          <p>בגרסת Starter זו הדמיה. בשלב Supabase הקבצים יישמרו באמת ב־Storage.</p>
          <div className="previewStrip">
            {gallery.slice(0, Math.min(Math.max(selected, 3), 6)).map((src) => <img key={src} src={src} alt="תצוגה מקדימה" />)}
          </div>
          <div className="uploadInfo"><span>JPG / PNG / HEIC</span><span>עד 20 תמונות בהעלאה</span></div>
          <button className="primaryButton" onClick={() => setView('success')}>העלו {selected} תמונות ❤️</button>
          <button className="secondaryButton" onClick={() => setView('home')}>ביטול</button>
        </section>
      </main>
    );
  }

  return (
    <main className="guestHero" style={{ '--event-accent': demoEvent.primaryColor } as React.CSSProperties}>
      <img className="guestHeroImage" src={demoEvent.coverImage} alt="תמונת קאבר של האירוע" />
      <div className="guestOverlay" />
      <Link href="/" className="guestHomeLink">⌂</Link>
      <section className="guestContent">
        <span className="eventPill">QR / NFC</span>
        <h1>{demoEvent.name}</h1>
        <div className="eventDate">{demoEvent.date}</div>
        <p>תודה שאתם כאן ❤️<br />שתפו אותנו ברגעים היפים שלכם.</p>
        <label className="primaryButton fileButton">
          📷 העלאת תמונות
          <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} />
        </label>
        <button className="secondaryButton glassButton" onClick={() => setView('album')}>▧ צפייה באלבום</button>
        <small>העלאה קלה ומהירה · ללא הרשמה</small>
      </section>
    </main>
  );
}
