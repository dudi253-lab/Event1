'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { StaffLogin } from '@/components/StaffLogin';
import {
  EventRow,
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

export default function ModeratorPage() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [session, setSession] = useState<StaffSession | null>(null);
  const [queue, setQueue] = useState<PhotoRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lastAction, setLastAction] = useState<{ photo: PhotoRow; status: Decision } | null>(null);

  useEffect(() => {
    void getEventBySlug().then(setEvent).catch(() => setError('לא הצלחנו לטעון את האירוע.'));
  }, []);

  const refreshQueue = async (nextSession = session) => {
    if (!nextSession || !event) return;
    try {
      setQueue(await listPendingPhotos(nextSession.token, event.id));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'לא הצלחנו לטעון את תור התמונות.');
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
      .channel(`bridesmaids-event-${event.id}`)
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

  const login = async (phone: string, pin: string) => {
    if (!event) throw new Error('האירוע עדיין נטען.');
    const next = await staffLogin(phone, pin, 'photo_moderator', event.id);
    setSession(next);
    await refreshQueue(next);
  };

  const decide = async (status: Decision) => {
    if (!session || !current || busy) return;
    setBusy(true);
    try {
      await moderatePhoto(session.token, current.id, status);
      setLastAction({ photo: current, status });
      setQueue((items) => items.slice(1));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה.');
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!session || !lastAction || busy) return;
    setBusy(true);
    try {
      await moderatePhoto(session.token, lastAction.photo.id, 'pending');
      setQueue((items) => [lastAction.photo, ...items]);
      setLastAction(null);
    } catch {
      setError('לא הצלחנו לבטל את הפעולה.');
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return (
      <StaffLogin
        roleLabel="שושבינות"
        title="כניסה לאישור תמונות"
        subtitle="גישה מהירה לתור התמונות של האירוע."
        onSubmit={login}
      />
    );
  }

  return (
    <main className="moderatorPage">
      <header className="moderatorHeader">
        <Link className="modIcon" href="/">⌂</Link>
        <div>
          <strong>{event?.name || 'האירוע'}</strong>
          <span>שושבינות · {event?.event_type || 'אירוע'}</span>
        </div>
        {event?.cover_image ? (
          <img className="modEventThumb" src={event.cover_image} alt="" />
        ) : (
          <span className="modAvatar">♥</span>
        )}
      </header>

      <section className="moderatorStage">
        <div className="queueHeader">
          <span className="queueBadge">{queue.length} ממתינות לאישור</span>
          <button className="refreshButton" onClick={() => void refreshQueue()} disabled={busy}>↻</button>
        </div>

        {current ? (
          <>
            <div className="moderationPhotoWrap">
              <img src={publicPhotoUrl(current.storage_path)} alt={current.original_filename || 'תמונה לאישור'} />
              <span className="photoAge">{new Date(current.uploaded_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            <div className="decisionRow">
              <button className="decision reject" onClick={() => void decide('rejected')} disabled={busy}>
                <b>×</b><span>דחה</span>
              </button>
              <button className="decision private" onClick={() => void decide('private')} disabled={busy}>
                <b>▣</b><span>פרטי</span>
              </button>
              <button className="decision approve" onClick={() => void decide('approved')} disabled={busy}>
                <b>✓</b><span>אשר</span>
              </button>
            </div>
          </>
        ) : (
          <div className="queueEmpty">
            <div>✓</div>
            <h2>התור נקי</h2>
            <p>אין כרגע תמונות שממתינות לאישור.</p>
          </div>
        )}

        {error && <div className="moderatorError">{error}</div>}

        {lastAction && (
          <button className="undoToast" onClick={() => void undo()} disabled={busy}>
            {lastAction.status === 'approved'
              ? 'התמונה אושרה'
              : lastAction.status === 'private'
                ? 'התמונה הועברה לפרטי'
                : 'התמונה נדחתה'} · <u>ביטול</u>
          </button>
        )}
      </section>
    </main>
  );
}
