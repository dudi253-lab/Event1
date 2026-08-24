'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Logo } from '@/components/Logo';
import { DEMO_EVENT_SLUG, EventRow, getEventBySlug } from '@/lib/event-api';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setEvent(await getEventBySlug());
      setError('');
    } catch {
      setError('לא הצלחנו לטעון את פרטי האירוע.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!event?.id) return;
    const channel = supabase
      .channel(`home-event-${event.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${event.id}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [event?.id]);

  return (
    <main className="landingPage">
      <section
        className="landingHero"
        style={
          event?.cover_image
            ? { backgroundImage: `linear-gradient(180deg, rgba(13,12,20,.18), rgba(13,12,20,.78)), url("${event.cover_image}")` }
            : undefined
        }
      >
        <div className="landingTop">
          <Logo />
          <span className="versionBadge">v0.2</span>
        </div>

        <div className="landingHeroContent">
          <span className="eventTypeBadge">{event?.event_type || 'אירוע'}</span>
          <h1>{event?.name || 'Moments'}</h1>
          <p>כל הרגעים של האירוע, במקום אחד.</p>
          <Link className="heroAlbumButton" href={`/e/${DEMO_EVENT_SLUG}`}>
            כניסה לאלבום
            <span>←</span>
          </Link>
          {error && <small className="landingError">{error}</small>}
        </div>
      </section>

      <section className="operationsSection">
        <div className="operationsHeading">
          <span>אזור תפעול האפליקציה</span>
          <h2>כל מה שצריך מאחורי הקלעים</h2>
          <p>הגישה לאזורי התפעול מיועדת רק למי שהוגדר מראש.</p>
        </div>

        <div className="operationsGrid">
          <Link className="operationCard adminOperation" href="/admin">
            <div className="operationIcon">⌘</div>
            <div>
              <span>ניהול מלא</span>
              <h3>פאנל מנהלים</h3>
              <p>שם האירוע, סוג האירוע, קאבר, סטטיסטיקות והגדרות.</p>
            </div>
            <b>←</b>
          </Link>

          <Link className="operationCard bridesmaidsOperation" href="/moderator">
            <div className="operationIcon">♥</div>
            <div>
              <span>אישור תמונות</span>
              <h3>שושבינות</h3>
              <p>תור התמונות הממתינות: אישור, פרטי או דחייה.</p>
            </div>
            <b>←</b>
          </Link>
        </div>
      </section>
    </main>
  );
}
