'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { StaffLogin } from '@/components/StaffLogin';
import {
  EventRow,
  EventStats,
  getApprovedPhotos,
  getEventBySlug,
  getEventStats,
  staffLogin,
  StaffSession,
  updateEventBranding,
  uploadEventCover,
} from '@/lib/event-api';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [session, setSession] = useState<StaffSession | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'design'>('dashboard');
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
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
    void loadEvent().catch(() => setError('לא הצלחנו לטעון את האירוע.'));
  }, []);

  const refreshStats = async (nextSession = session, nextEvent = event) => {
    if (!nextSession || !nextEvent) return;
    try {
      setStats(await getEventStats(nextSession.token, nextEvent.id));
    } catch {
      // The editor still remains usable if stats fail.
    }
  };

  useEffect(() => {
    if (session && event) void refreshStats();
  }, [session?.token, event?.id]);

  useEffect(() => {
    if (!event?.id) return;
    const channel = supabase
      .channel(`admin-event-${event.id}`)
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

  const login = async (phone: string, pin: string) => {
    const nextEvent = event ?? await loadEvent();
    const nextSession = await staffLogin(phone, pin, 'company_admin', nextEvent.id);
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
      if (coverFile) {
        coverImage = await uploadEventCover(event.id, coverFile);
      }

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

  if (!session) {
    return (
      <StaffLogin
        roleLabel="פאנל מנהלים"
        title="כניסה לפאנל המנהלים"
        subtitle="ניהול האירוע, המיתוג והתוכן בזמן אמת."
        onSubmit={login}
      />
    );
  }

  return (
    <main className="adminPage">
      <aside className="adminSidebar">
        <Logo />
        <nav>
          <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            ⌂ <span>סקירה כללית</span>
          </button>
          <button className={activeTab === 'design' ? 'active' : ''} onClick={() => setActiveTab('design')}>
            ✦ <span>עיצוב האירוע</span>
          </button>
          <Link href="/moderator">♥ <span>שושבינות</span></Link>
          <Link href="/e/demo-event">▧ <span>אלבום</span></Link>
        </nav>
        <Link href="/" className="backToHub">← עמוד ראשי</Link>
      </aside>

      <section className="adminMain">
        <header className="adminTopbar">
          <div>
            <span className="sectionEyebrow">Moments · v0.2</span>
            <h1>{activeTab === 'design' ? 'עיצוב האירוע' : 'פאנל מנהלים'}</h1>
          </div>
          <div className="adminAvatar">{session.user_name?.slice(0, 2) || 'M'}</div>
        </header>

        {activeTab === 'dashboard' ? (
          <>
            <div className="metricGrid">
              <Metric label="סה״כ תמונות" value={stats?.total ?? 0} icon="▧" />
              <Metric label="ממתינות" value={stats?.pending ?? 0} icon="◷" />
              <Metric label="מאושרות" value={stats?.approved ?? 0} icon="✓" />
              <Metric label="פרטיות" value={stats?.private_count ?? 0} icon="▣" />
            </div>

            <section className="adminPanel">
              <div className="panelHeader">
                <div>
                  <span className="sectionEyebrow">האירוע הפעיל</span>
                  <h2>{event?.name || 'האירוע'}</h2>
                </div>
                <button className="adminPrimary" onClick={() => setActiveTab('design')}>עריכת אירוע</button>
              </div>

              <div className="eventSummaryCard">
                {event?.cover_image ? <img src={event.cover_image} alt="" /> : <div className="coverPlaceholder" />}
                <div>
                  <span>{event?.event_type || 'אירוע'}</span>
                  <strong>{event?.name || 'Moments'}</strong>
                  <p>שינויים בשם ובקאבר מתעדכנים באלבום ובשושבינות דרך Supabase.</p>
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="designWorkspace">
            <form className="designForm" onSubmit={saveBranding}>
              <span className="sectionEyebrow">אירוע: {event?.name}</span>
              <h2>מיתוג האירוע</h2>
              <p>כל שמירה כאן מתעדכנת באותו אירוע בכל הממשקים.</p>

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
                <span>בחר תמונה מהגלריה או מהקבצים</span>
                <input type="file" accept="image/*" onChange={selectCover} />
              </label>

              {error && <div className="formError">{error}</div>}
              <button className="adminPrimary" type="submit" disabled={busy}>
                {busy ? 'שומר…' : 'שמירת שינויים'}
              </button>
              {saved && <div className="saveNotice">✓ השינויים נשמרו וסונכרנו</div>}
            </form>

            <div className="phonePreviewCard">
              <div className="previewLabel">תצוגה מקדימה</div>
              <div
                className="previewPhone"
                style={
                  coverPreview
                    ? { backgroundImage: `linear-gradient(180deg, rgba(10,8,15,.08), rgba(10,8,15,.8)), url("${coverPreview}")` }
                    : undefined
                }
              >
                <div className="previewContent">
                  <span>{eventType || 'אירוע'}</span>
                  <h3>{name || 'שם האירוע'}</h3>
                  <button type="button">📷 העלאת תמונות</button>
                </div>
              </div>
              <Link className="previewLink" href="/e/demo-event">פתיחת האלבום ←</Link>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="metricCard">
      <span className="metricIcon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
