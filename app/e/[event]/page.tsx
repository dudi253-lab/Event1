'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useState } from 'react';
import {
  EventRow,
  getApprovedPhotos,
  getEventBySlug,
  PhotoRow,
  publicPhotoUrl,
  uploadGuestPhotos,
} from '@/lib/event-api';
import { supabase } from '@/lib/supabase';

type View = 'home' | 'upload' | 'success' | 'album';

export default function GuestEventPage() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [view, setView] = useState<View>('home');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState('');

  const loadEvent = async () => {
    try {
      const nextEvent = await getEventBySlug();
      setEvent(nextEvent);
      setError('');
      return nextEvent;
    } catch {
      setError('לא הצלחנו לטעון את האירוע.');
      return null;
    }
  };

  const loadAlbum = async (eventId?: string) => {
    const id = eventId ?? event?.id;
    if (!id) return;
    try {
      setPhotos(await getApprovedPhotos(id));
    } catch {
      setError('לא הצלחנו לטעון את האלבום.');
    }
  };

  useEffect(() => {
    void (async () => {
      const loaded = await loadEvent();
      if (loaded) await loadAlbum(loaded.id);
    })();
  }, []);

  useEffect(() => {
    if (!event?.id) return;

    const eventChannel = supabase
      .channel(`guest-event-${event.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${event.id}` },
        () => void loadEvent(),
      )
      .subscribe();

    const photoChannel = supabase
      .channel(`guest-photos-${event.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'photos', filter: `event_id=eq.${event.id}` },
        () => void loadAlbum(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(eventChannel);
      void supabase.removeChannel(photoChannel);
    };
  }, [event?.id]);

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, 20);
    if (!selected.length) return;
    setFiles(selected);
    setView('upload');
    setError('');
  };

  const upload = async () => {
    if (!event || !files.length) return;
    setBusy(true);
    setError('');
    try {
      const count = await uploadGuestPhotos(event.id, files);
      setUploadedCount(count);
      setFiles([]);
      setView('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההעלאה נכשלה. נסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  if (view === 'album') {
    return (
      <main className="albumPage">
        <header className="albumTopbar">
          <button className="roundIcon" onClick={() => setView('home')}>→</button>
          <div>
            <strong>{event?.name || 'האלבום'}</strong>
            <span>{photos.length} תמונות מאושרות</span>
          </div>
          <Link className="roundIcon" href="/">⌂</Link>
        </header>

        <section
          className="albumCover"
          style={
            event?.cover_image
              ? { backgroundImage: `linear-gradient(180deg, rgba(10,8,15,.12), rgba(10,8,15,.78)), url("${event.cover_image}")` }
              : undefined
          }
        >
          <span>{event?.event_type || 'אירוע'}</span>
          <h1>{event?.name || 'Moments'}</h1>
        </section>

        <section className="albumIntro">
          <span>האלבום המשותף</span>
          <h1>הרגעים שלכם</h1>
          <p>רק תמונות שאושרו על ידי השושבינות מופיעות כאן.</p>
        </section>

        {photos.length ? (
          <div className="photoGrid">
            {photos.map((photo) => (
              <a
                key={photo.id}
                href={publicPhotoUrl(photo.storage_path)}
                target="_blank"
                rel="noreferrer"
                className="photoTile"
              >
                <img src={publicPhotoUrl(photo.storage_path)} alt={photo.original_filename || 'תמונת אירוע'} />
              </a>
            ))}
          </div>
        ) : (
          <div className="emptyAlbum">
            <b>האלבום עוד מחכה לרגע הראשון ✨</b>
            <span>תמונות שאושרו יופיעו כאן אוטומטית.</span>
          </div>
        )}

        <label className="floatingUpload">
          ＋ העלאת תמונות
          <input type="file" accept="image/*" multiple onChange={onFiles} />
        </label>
      </main>
    );
  }

  if (view === 'success') {
    return (
      <main className="guestSimplePage">
        <div className="successOrb">✓</div>
        <span className="sectionEyebrow">העלאה הושלמה</span>
        <h1>קיבלנו! ❤️</h1>
        <p>{uploadedCount} תמונות נשמרו וממתינות לאישור.</p>
        <button className="primaryButton" onClick={() => setView('home')}>📸 להעלות עוד</button>
        <button className="secondaryButton" onClick={() => setView('album')}>לצפייה באלבום</button>
      </main>
    );
  }

  if (view === 'upload') {
    return (
      <main className="guestSimplePage">
        <button className="screenBack" onClick={() => setView('home')}>→</button>
        <span className="sectionEyebrow">{files.length} תמונות נבחרו</span>
        <h1>מוכנים לשתף?</h1>
        <p>התמונות יישמרו מיד ויעברו לתור האישור של השושבינות.</p>
        <div className="selectedFiles">
          {files.slice(0, 8).map((file, index) => (
            <span key={`${file.name}-${index}`}>{file.name}</span>
          ))}
        </div>
        {error && <div className="formError">{error}</div>}
        <button className="primaryButton" onClick={upload} disabled={busy}>
          {busy ? 'מעלה…' : `העלאת ${files.length} תמונות`}
        </button>
        <button className="secondaryButton" onClick={() => setView('home')} disabled={busy}>ביטול</button>
      </main>
    );
  }

  return (
    <main
      className="guestHero"
      style={
        event?.cover_image
          ? { backgroundImage: `linear-gradient(180deg, rgba(10,8,15,.18), rgba(10,8,15,.84)), url("${event.cover_image}")` }
          : undefined
      }
    >
      <Link href="/" className="guestHomeLink">⌂</Link>
      <section className="guestHeroContent">
        <span className="eventPill">{event?.event_type || 'אירוע'}</span>
        <h1>{event?.name || 'Moments'}</h1>
        {event?.event_date && <div className="eventDate">{event.event_date}</div>}
        <p>תודה שאתם כאן ❤️<br />שתפו את הרגעים שראיתם מהצד שלכם.</p>

        <label className="primaryButton fileButton">
          📷 העלאת תמונות
          <input type="file" accept="image/*" multiple onChange={onFiles} />
        </label>

        <button className="secondaryButton glassButton" onClick={() => setView('album')}>
          ▧ פתיחת האלבום
        </button>

        {error && <small className="guestError">{error}</small>}
        <small>ללא הרשמה · עד 20 תמונות בכל העלאה</small>
      </section>
    </main>
  );
}
