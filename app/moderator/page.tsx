'use client';

import Link from 'next/link';
import { useEffect, useState, type PointerEvent } from 'react';
import { StaffLogin } from '@/components/StaffLogin';
import {
  EventRow,
  getApprovedPhotos,
  getEventBySlug,
  listPendingPhotos,
  moderatePhoto,
  PhotoRow,
  publicPhotoUrl,
  staffLogin,
  StaffSession,
} from '@/lib/event-api';
import { supabase } from '@/lib/supabase';

type Decision = 'approved' | 'private' | 'rejected';
type Tab = 'pending' | 'published';

export default function ModeratorPage() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [session, setSession] = useState<StaffSession | null>(null);
  const [queue, setQueue] = useState<PhotoRow[]>([]);
  const [published, setPublished] = useState<PhotoRow[]>([]);
  const [tab, setTab] = useState<Tab>('pending');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState<{ photo: PhotoRow; status: Decision } | null>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);

  useEffect(() => {
    void getEventBySlug().then(setEvent).catch(() => setError('לא הצלחנו לטעון את האירוע.'));
  }, []);

  const refreshQueue = async (nextSession = session, nextEvent = event) => {
    if (!nextSession || !nextEvent) return;
    try {
      const [pendingRows, approvedRows] = await Promise.all([
        listPendingPhotos(nextSession.token, nextEvent.id),
        getApprovedPhotos(nextEvent.id),
      ]);
      setQueue(pendingRows);
      setPublished(approvedRows);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא הצלחנו לטעון את התמונות.');
    }
  };

  useEffect(() => {
    if (!session || !event) return;
    void refreshQueue();
    const timer = window.setInterval(() => void refreshQueue(), 7000);
    return () => window.clearInterval(timer);
  }, [session?.token, event?.id]);

  useEffect(() => {
    if (!event?.id) return;
    const channel = supabase
      .channel(`digi-bridesmaids-${event.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${event.id}` },
        () => void getEventBySlug().then(setEvent),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [event?.id]);

  const current = queue[0] ?? null;

  const login = async (pin: string) => {
    const nextEvent = event ?? await getEventBySlug();
    setEvent(nextEvent);
    const next = await staffLogin(pin, 'photo_moderator', nextEvent.id);
    setSession(next);
    await refreshQueue(next, nextEvent);
  };

  const decide = async (status: Decision) => {
    if (!session || !current || busy) return;
    const photo = current;
    setBusy(true);
    try {
      await moderatePhoto(session.token, photo.id, status);
      setLastAction({ photo, status });
      setQueue((items) => items.slice(1));
      if (status === 'approved') setPublished((items) => [photo, ...items]);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה.');
    } finally {
      setBusy(false);
      setDragX(0);
    }
  };

  const swipeDecision = (status: 'approved' | 'rejected', direction: 1 | -1) => {
    if (busy || !current) return;
    if ('vibrate' in navigator) navigator.vibrate?.(20);
    setDragX(direction * Math.max(window.innerWidth, 420));
    window.setTimeout(() => void decide(status), 180);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (busy) return;
    setDragStart(e.clientX);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStart === null || busy) return;
    setDragX(e.clientX - dragStart);
  };

  const onPointerUp = () => {
    if (dragStart === null || busy) return;
    setDragStart(null);
    if (dragX > 82) swipeDecision('approved', 1);
    else if (dragX < -82) swipeDecision('rejected', -1);
    else setDragX(0);
  };

  const undo = async () => {
    if (!session || !lastAction || busy) return;
    setBusy(true);
    try {
      await moderatePhoto(session.token, lastAction.photo.id, 'pending');
      setQueue((items) => [lastAction.photo, ...items]);
      setPublished((items) => items.filter((photo) => photo.id !== lastAction.photo.id));
      setLastAction(null);
    } catch {
      setError('לא הצלחנו לבטל את הפעולה.');
    } finally {
      setBusy(false);
    }
  };

  const removePublished = async (photo: PhotoRow) => {
    if (!session || busy) return;
    setBusy(true);
    try {
      await moderatePhoto(session.token, photo.id, 'private');
      setPublished((items) => items.filter((item) => item.id !== photo.id));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא הצלחנו להסיר מהאלבום.');
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <StaffLogin
        roleLabel="Digi · שושבינות"
        title="אישור תמונות"
        subtitle="קוד קצר, ואז פשוט מחליקים."
        onSubmit={login}
      />
    );
  }

  return (
    <main className="moderatorPage">
      <header className="moderatorHeader">
        <Link className="tinyBack" href="/e/demo-event">אלבום</Link>
        <div className="moderatorTitle">
          <span>שושבינות</span>
          <strong>{event?.name || 'האירוע'}</strong>
        </div>
        {event?.cover_image ? <img className="moderatorEventThumb" src={event.cover_image} alt="" /> : <span className="moderatorEventThumb fallback">D</span>}
      </header>

      <div className="moderatorTabs">
        <button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>ממתינות <b>{queue.length}</b></button>
        <button className={tab === 'published' ? 'active' : ''} onClick={() => setTab('published')}>פורסמו <b>{published.length}</b></button>
      </div>

      {tab === 'pending' ? (
        <section className="swipeStage">
          {current ? (
            <>
              <div
                className="swipeCard"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={() => { setDragStart(null); setDragX(0); }}
                style={{ transform: `translateX(${dragX}px) rotate(${dragX / 26}deg)`, transition: dragStart === null ? 'transform .18s ease' : 'none' }}
              >
                <img src={publicPhotoUrl(current.storage_path)} alt={current.original_filename || 'תמונה לאישור'} draggable={false} />
                <div className="swipeApprove" style={{ opacity: Math.max(0, Math.min(1, dragX / 90)) }}>✓ לפרסם</div>
                <div className="swipeReject" style={{ opacity: Math.max(0, Math.min(1, -dragX / 90)) }}>× לדחות</div>
              </div>

              <p className="swipeHint">ימינה לפרסום · שמאלה לדחייה</p>

              <div className="swipeActions">
                <button className="roundDecision reject" onClick={() => swipeDecision('rejected', -1)} disabled={busy} aria-label="דחה">×</button>
                <button className="roundDecision private" onClick={() => void decide('private')} disabled={busy}>פרטי</button>
                <button className="roundDecision approve" onClick={() => swipeDecision('approved', 1)} disabled={busy} aria-label="אשר">✓</button>
              </div>
            </>
          ) : (
            <div className="queueDone">
              <span>✓</span>
              <h2>הכול מאושר</h2>
              <p>אין כרגע תמונות שממתינות לך.</p>
            </div>
          )}

          {lastAction && (
            <button className="undoBar" onClick={() => void undo()} disabled={busy}>
              הפעולה בוצעה · <u>ביטול</u>
            </button>
          )}
        </section>
      ) : (
        <section className="publishedPanel">
          <div className="publishedIntro">
            <span>האלבום הציבורי</span>
            <h2>תמונות שפורסמו</h2>
            <p>אפשר להסיר תמונה מהאלבום בלי למחוק אותה לצמיתות.</p>
          </div>

          {published.length ? (
            <div className="publishedGrid">
              {published.map((photo) => (
                <article key={photo.id}>
                  <img src={publicPhotoUrl(photo.storage_path)} alt={photo.original_filename || 'תמונה שפורסמה'} />
                  <button onClick={() => void removePublished(photo)} disabled={busy}>הסר מהאלבום</button>
                </article>
              ))}
            </div>
          ) : (
            <div className="publishedEmpty">אין עדיין תמונות שפורסמו.</div>
          )}
        </section>
      )}

      {error && <div className="floatingError">{error}</div>}
    </main>
  );
}
