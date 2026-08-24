'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { StaffLogin } from '@/components/StaffLogin';
import {
  DEMO_EVENT_SLUG,
  EventRow,
  EventStats,
  getEventBySlug,
  getEventStats,
  staffLogin,
  StaffSession,
  updateEventBranding,
  uploadEventCover,
} from '@/lib/event-api';
import { supabase } from '@/lib/supabase';

type Tab = 'dashboard' | 'design' | 'access';

export default function AdminPage() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [session, setSession] = useState<StaffSession | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [error, setError] = useState('');

  const loadEvent = async () => {
    const next = await getEventBySlug();
    setEvent(next);
    setName(next.name);
    setEventType(next.event_type || '');
    setCoverPreview(next.cover_image || '');
    return next;
  };

  useEffect(() => {
    setPublicUrl(`${window.location.origin}/e/${DEMO_EVENT_SLUG}`);
    void loadEvent().catch(() => setError('לא הצלחנו לטעון את האירוע.'));
  }, []);

  const refreshStats = async (nextSession = session, nextEvent = event) => {
    if (!nextSession || !nextEvent) return;
    try {
      setStats(await getEventStats(nextSession.token, nextEvent.id));
    } catch {
      // Keep the editor usable even if stats fail.
    }
  };

  useEffect(() => {
    if (session && event) void refreshStats();
  }, [session?.token, event?.id]);

  useEffect(() => {
    if (!event?.id) return;
    const channel = supabase
      .channel(`digi-admin-${event.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${event.id}` },
        () => void loadEvent(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [event?.id]);

  const login = async (pin: string) => {
    const nextEvent = event ?? await loadEvent();
    const nextSession = await staffLogin(pin, 'company_admin', nextEvent.id);
    setSession(nextSession);
    await refreshStats(nextSession, nextEvent);
  };

  const selectCover = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCoverFile(file);
    if (file) setCoverPreview(URL.createObjectURL(file));
  };

  const saveBranding = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || !event) return;
    setBusy(true);
    setError('');
    try {
      let coverImage: string | null = event.cover_image;
      if (coverFile) coverImage = await uploadEventCover(event.id, coverFile);

      const updated = await updateEventBranding(session.token, event.id, {
        name: name.trim() || event.name,
        eventType: eventType.trim() || 'אירוע',
        coverImage,
      });

      setEvent(updated);
      setName(updated.name);
      setEventType(updated.event_type || '');
      setCoverPreview(updated.cover_image || '');
      setCoverFile(null);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
      await refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1800);
  };

  const share = async () => {
    if (!publicUrl) return;
    if (navigator.share) {
      await navigator.share({ title: event?.name || 'Digi', text: 'האלבום המשותף שלנו', url: publicUrl });
    } else {
      await copy(publicUrl, 'קישור');
    }
  };

  if (!session) {
    return (
      <StaffLogin
        roleLabel="Digi · ניהול"
        title="פאנל מנהלים"
        subtitle="ניהול האירוע, המיתוג והגישה במקום אחד."
        onSubmit={login}
      />
    );
  }

  const qrSrc = publicUrl
    ? `https://quickchart.io/qr?text=${encodeURIComponent(publicUrl)}&size=420&margin=2&dark=111111&light=ffffff`
    : '';

  return (
    <main className="adminPage">
      <aside className="adminSidebar">
        <Logo />
        <nav>
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>סקירה</button>
          <button className={activeTab === 'design' ? 'active' : ''} onClick={() => setActiveTab('design')}>עיצוב</button>
          <button className={activeTab === 'access' ? 'active' : ''} onClick={() => setActiveTab('access')}>QR / NFC</button>
        </nav>
        <div className="sidebarLinks">
          <Link href="/moderator">שושבינות</Link>
          <Link href={`/e/${DEMO_EVENT_SLUG}`}>אלבום</Link>
        </div>
      </aside>

      <section className="adminMain">
        <header className="adminTopbar">
          <div>
            <span>Digi · v0.3</span>
            <h1>{activeTab === 'dashboard' ? 'פאנל מנהלים' : activeTab === 'design' ? 'עיצוב האירוע' : 'QR & NFC'}</h1>
          </div>
          <div className="adminAvatar">D</div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <div className="metricGrid">
              <Metric label="סה״כ" value={stats?.total ?? 0} />
              <Metric label="ממתינות" value={stats?.pending ?? 0} />
              <Metric label="פורסמו" value={stats?.approved ?? 0} />
              <Metric label="פרטיות" value={stats?.private_count ?? 0} />
            </div>

            <section className="adminPanel eventAdminCard">
              <div className="eventAdminCopy">
                <span>{event?.event_type || 'אירוע'}</span>
                <h2>{event?.name || 'האירוע'}</h2>
                <p>השם והקאבר מסתנכרנים אוטומטית לאלבום ולשושבינות.</p>
                <div className="adminInlineActions">
                  <button onClick={() => setActiveTab('design')}>עריכת אירוע</button>
                  <button className="secondaryAdminButton" onClick={() => setActiveTab('access')}>QR / NFC</button>
                </div>
              </div>
              {event?.cover_image && <img src={event.cover_image} alt="" />}
            </section>
          </>
        )}

        {activeTab === 'design' && (
          <section className="designWorkspace">
            <form className="designForm" onSubmit={saveBranding}>
              <span className="adminEyebrow">מיתוג האירוע</span>
              <h2>מה האורחים יראו</h2>
              <p>שינויים נשמרים בזמן אמת ומופיעים בכל הממשקים.</p>

              <label>
                שם האירוע
                <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </label>

              <label>
                סוג האירוע
                <input value={eventType} onChange={(e) => setEventType(e.target.value)} maxLength={50} placeholder="חתונה" />
              </label>

              <label className="coverUploadLabel">
                תמונת קאבר
                <span>בחירת תמונה מהאייפון</span>
                <input type="file" accept="image/*" onChange={selectCover} />
              </label>

              {error && <div className="inlineError">{error}</div>}
              <button className="adminPrimary" type="submit" disabled={busy}>{busy ? 'שומר…' : 'שמירת שינויים'}</button>
              {saved && <div className="saveNotice">✓ נשמר וסונכרן</div>}
            </form>

            <div className="coverPreviewCard">
              <span>תצוגה מקדימה</span>
              <div
                className="coverPreview"
                style={coverPreview ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.7)), url("${coverPreview}")` } : undefined}
              >
                <small>{eventType || 'אירוע'}</small>
                <strong>{name || 'שם האירוע'}</strong>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'access' && (
          <section className="accessWorkspace">
            <div className="accessIntro">
              <span className="adminEyebrow">כניסה לאירוע</span>
              <h2>קישור אחד. QR אחד. NFC אחד.</h2>
              <p>כולם מובילים ישר לאלבום הציבורי של האירוע.</p>
            </div>

            <div className="accessGrid">
              <article className="qrCard">
                <div className="qrFrame">{qrSrc && <img src={qrSrc} alt="QR לאלבום" />}</div>
                <h3>QR לאלבום</h3>
                <p>מוכן להצגה על שלט, שולחן או מסך.</p>
                <button onClick={() => void share()}>שיתוף QR / קישור</button>
              </article>

              <article className="linkCard">
                <span>קישור ציבורי</span>
                <h3>{event?.name}</h3>
                <div className="urlBox">{publicUrl}</div>
                <button onClick={() => void copy(publicUrl, 'קישור')}>{copied === 'קישור' ? '✓ הועתק' : 'העתקת קישור'}</button>

                <div className="nfcBlock">
                  <span>NFC</span>
                  <h4>זה הקישור שצורבים לתג</h4>
                  <p>באייפון הצריבה עצמה נעשית דרך אפליקציית NFC. Digi מכינה לך את ה־URL המדויק.</p>
                  <button className="secondaryAdminButton" onClick={() => void copy(publicUrl, 'NFC')}>{copied === 'NFC' ? '✓ הועתק' : 'העתקת קישור ל־NFC'}</button>
                </div>
              </article>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metricCard">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
