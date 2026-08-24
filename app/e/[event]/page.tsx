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

export default function GuestEventPage() {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const loadEvent = async () => {
    const next = await getEventBySlug();
    setEvent(next);
    return next;
  };

  const loadAlbum = async (eventId?: string) => {
    const id = eventId ?? event?.id;
    if (!id) return;
    setPhotos(await getApprovedPhotos(id));
  };

  useEffect(() => {
    void (async () => {
      try {
        const loaded = await loadEvent();
        await loadAlbum(loaded.id);
      } catch {
        setError('לא הצלחנו לטעון את האלבום.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!event?.id) return;

    const eventChannel = supabase
      .channel(`digi-event-${event.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${event.id}` },
        () => void loadEvent(),
      )
      .subscribe();

    const photoChannel = supabase
      .channel(`digi-photos-${event.id}`)
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
    setMessage('');
    setError('');
    e.target.value = '';
  };

  const upload = async () => {
    if (!event || !files.length) return;
    setBusy(true);
    setError('');
    try {
      const count = await uploadGuestPhotos(event.id, files);
      setFiles([]);
      setMessage(`${count} תמונות עלו בהצלחה וממתינות לאישור ✨`);
      window.setTimeout(() => setMessage(''), 4500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההעלאה נכשלה. נסו שוב.');
    } finally {
      setBusy(false);
    }
  };

  const dateLabel = event?.event_date
    ? new Date(`${event.event_date}T00:00:00`).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <main className="digiAlbumPage">
      <section
        className="digiHero"
        style={
          event?.cover_image
            ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.68)), url("${event.cover_image}")` }
            : undefined
        }
      >
        <div className="digiHeroTop">
          <span className="digiWordmark">Digi</span>
          <span className="heroEventType">{event?.event_type || 'אירוע'}</span>
        </div>

        <div className="digiHeroContent">
          {dateLabel && <span className="heroDate">{dateLabel}</span>}
          <h1>{event?.name || 'האירוע שלכם'}</h1>
          <p>האירוע שלכם, דרך העיניים של כולם.</p>
          <label className="albumUploadCta">
            <span>＋</span> שתפו רגע
            <input type="file" accept="image/*" multiple onChange={onFiles} />
          </label>
          <small>ללא הרשמה · עד 20 תמונות בכל העלאה</small>
        </div>
      </section>

      <section className="albumBody">
        <header className="albumSectionHeader">
          <div>
            <span>האלבום המשותף</span>
            <h2>הרגעים שלנו</h2>
          </div>
          <b>{photos.length}</b>
        </header>

        {error && <div className="inlineError">{error}</div>}

        {photos.length ? (
          <div className="digiPhotoGrid">
            {photos.map((photo, index) => (
              <button className="digiPhotoTile" key={photo.id} onClick={() => setLightbox(index)}>
                <img loading="lazy" src={publicPhotoUrl(photo.storage_path)} alt={photo.original_filename || 'תמונת אירוע'} />
              </button>
            ))}
          </div>
        ) : (
          <div className="albumEmpty">
            <span>✦</span>
            <h3>הרגע הראשון עוד בדרך</h3>
            <p>תמונות שאושרו יופיעו כאן אוטומטית.</p>
          </div>
        )}
      </section>

      <footer className="digiFooter">
        <span>Digi</span>
        <div className="stealthOps">
          <Link href="/moderator">שושבינות</Link>
          <span>·</span>
          <Link href="/admin">ניהול</Link>
        </div>
      </footer>

      <label className="floatingDigiUpload">
        ＋ העלאת תמונות
        <input type="file" accept="image/*" multiple onChange={onFiles} />
      </label>

      {files.length > 0 && (
        <div className="uploadSheetBackdrop" onClick={() => !busy && setFiles([])}>
          <section className="uploadSheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheetHandle" />
            <span className="sheetEyebrow">{files.length} תמונות נבחרו</span>
            <h2>מעלים ל־Digi?</h2>
            <p>התמונות יעברו לשושבינות לאישור לפני שהן מופיעות באלבום.</p>
            <div className="fileChips">
              {files.slice(0, 5).map((file, index) => (
                <span key={`${file.name}-${index}`}>{file.name}</span>
              ))}
              {files.length > 5 && <span>+{files.length - 5} נוספות</span>}
            </div>
            {error && <div className="inlineError">{error}</div>}
            <button className="primaryButton" onClick={() => void upload()} disabled={busy}>
              {busy ? 'מעלה…' : `העלאת ${files.length} תמונות`}
            </button>
            <button className="textButton" onClick={() => setFiles([])} disabled={busy}>ביטול</button>
          </section>
        </div>
      )}

      {message && <div className="successToast">✓ {message}</div>}

      {lightbox !== null && photos[lightbox] && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightboxClose" onClick={() => setLightbox(null)}>×</button>
          <img src={publicPhotoUrl(photos[lightbox].storage_path)} alt="תמונה מוגדלת" onClick={(e) => e.stopPropagation()} />
          <div className="lightboxNav" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox((current) => current === null ? 0 : (current - 1 + photos.length) % photos.length)}>→</button>
            <span>{lightbox + 1} / {photos.length}</span>
            <button onClick={() => setLightbox((current) => current === null ? 0 : (current + 1) % photos.length)}>←</button>
          </div>
        </div>
      )}
    </main>
  );
}
