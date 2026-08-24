'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Logo } from '@/components/Logo';
import { StatusBadge } from '@/components/StatusBadge';
import { demoEvent, events } from '@/lib/mock-data';
import { MockPhoneLogin } from '@/components/MockPhoneLogin';

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'design'>('dashboard');
  const [name, setName] = useState(demoEvent.name);
  const [cover, setCover] = useState(demoEvent.coverImage);
  const [savedName, setSavedName] = useState(demoEvent.name);
  const [savedCover, setSavedCover] = useState(demoEvent.coverImage);
  const [saved, setSaved] = useState(false);

  if (!loggedIn) {
    return (
      <MockPhoneLogin
        roleLabel="נציג החברה"
        title="כניסה ל־Back Office"
        subtitle="ניהול אירועים, מאשרים, מיתוג ו־QR/NFC."
        onSuccess={() => setLoggedIn(true)}
      />
    );
  }

  const saveBranding = (e: FormEvent) => {
    e.preventDefault();
    setSavedName(name.trim() || demoEvent.name);
    setSavedCover(cover.trim() || demoEvent.coverImage);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <main className="adminPage">
      <aside className="adminSidebar">
        <Logo />
        <nav>
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>⌂ <span>סקירה כללית</span></button>
          <button onClick={() => setActiveTab('dashboard')}>▣ <span>אירועים</span></button>
          <button onClick={() => setActiveTab('dashboard')}>＋ <span>יצירת אירוע</span></button>
          <button onClick={() => setActiveTab('dashboard')}>▧ <span>תמונות</span></button>
          <button onClick={() => setActiveTab('dashboard')}>✓ <span>מאשרי תמונות</span></button>
          <button onClick={() => setActiveTab('dashboard')}>⌁ <span>QR / NFC</span></button>
          <button onClick={() => setActiveTab('design')}>✦ <span>עיצוב האירוע</span></button>
          <button onClick={() => setActiveTab('dashboard')}>⌘ <span>הגדרות</span></button>
        </nav>
        <Link href="/" className="backToHub">← בחירת ממשק</Link>
      </aside>

      <section className="adminMain">
        <header className="adminTopbar">
          <div>
            <span className="eyebrow">Moments Back Office</span>
            <h1>{activeTab === 'design' ? 'עיצוב האירוע' : 'שלום, נציג החברה 👋'}</h1>
          </div>
          <div className="adminAvatar">DA</div>
        </header>

        {activeTab === 'dashboard' ? (
          <>
            <div className="metricGrid">
              <Metric label="סה״כ אירועים" value="24" icon="◫" />
              <Metric label="ממתינות לאישור" value="96" icon="◷" />
              <Metric label="תמונות היום" value="1,284" icon="▧" />
              <Metric label="אירועים פעילים" value="3" icon="●" />
            </div>
            <section className="adminPanel">
              <div className="panelHeader">
                <div><span className="eyebrow">ניהול שוטף</span><h2>אירועים אחרונים</h2></div>
                <button className="adminPrimary">＋ אירוע חדש</button>
              </div>
              <div className="eventTable">
                {events.map((event) => (
                  <button className="eventRow" key={event.id} onClick={() => event.id === demoEvent.id && setActiveTab('design')}>
                    <img src={event.coverImage} alt="" />
                    <div className="eventName"><strong>{event.id === demoEvent.id ? savedName : event.name}</strong><span>{event.type} · {event.date}</span></div>
                    <div className="eventStat"><strong>{event.photos}</strong><span>תמונות</span></div>
                    <div className="eventStat"><strong>{event.pending}</strong><span>ממתינות</span></div>
                    <StatusBadge status={event.status} />
                    <span className="rowArrow">←</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="designWorkspace">
            <form className="designForm" onSubmit={saveBranding}>
              <span className="eyebrow">אירוע: {savedName}</span>
              <h2>שם וקאבר דינמיים</h2>
              <p>השדות האלה מיועדים לעבור ל־Database. כרגע הם מדגימים את ההתנהגות של מסך הניהול.</p>
              <label>
                שם האירוע
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </label>
              <label>
                כתובת תמונת קאבר
                <input dir="ltr" value={cover} onChange={(e) => setCover(e.target.value)} />
              </label>
              <div className="colorFields">
                <label>צבע ראשי<input type="color" defaultValue="#7c3aed" /></label>
                <label>צבע משני<input type="color" defaultValue="#f5f3ff" /></label>
              </div>
              <button className="adminPrimary" type="submit">שמירת שינויים</button>
              {saved && <div className="saveNotice">✓ השינויים נשמרו בדמו</div>}
            </form>
            <div className="phonePreviewCard">
              <div className="previewLabel">תצוגה מקדימה לאורח</div>
              <div className="previewPhone">
                <img src={cover || demoEvent.coverImage} alt="תצוגת קאבר" />
                <div className="previewShade" />
                <div className="previewContent">
                  <span>QR / NFC</span>
                  <h3>{name || 'שם האירוע'}</h3>
                  <p>{demoEvent.date}</p>
                  <button>📷 העלאת תמונות</button>
                </div>
              </div>
              <Link className="previewLink" href="/e/demo-event">פתיחת ממשק האורח ←</Link>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: string }) {
  return <div className="metricCard"><span className="metricIcon">{icon}</span><span>{label}</span><strong>{value}</strong></div>;
}
