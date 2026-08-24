'use client';

import Link from 'next/link';
import { useState } from 'react';
import { demoEvent, gallery } from '@/lib/mock-data';
import { MockPhoneLogin } from '@/components/MockPhoneLogin';

type Decision = 'approved' | 'private' | 'rejected' | null;

export default function ModeratorPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [index, setIndex] = useState(0);
  const [decision, setDecision] = useState<Decision>(null);
  const [processed, setProcessed] = useState(0);
  const total = 27;

  if (!loggedIn) {
    return (
      <MockPhoneLogin
        roleLabel="מאשר תמונות"
        title="כניסה לאישור תמונות"
        subtitle="הכניסה מיועדת רק למספרי טלפון שהוגדרו מראש עבור האירוע."
        onSuccess={() => setLoggedIn(true)}
      />
    );
  }

  const decide = (next: Exclude<Decision, null>) => {
    setDecision(next);
    setProcessed((value) => value + 1);
    setIndex((value) => (value + 1) % gallery.length);
  };

  const undo = () => {
    if (!decision) return;
    setProcessed((value) => Math.max(0, value - 1));
    setIndex((value) => (value - 1 + gallery.length) % gallery.length);
    setDecision(null);
  };

  return (
    <main className="moderatorPage">
      <header className="moderatorHeader">
        <Link className="modIcon" href="/">⌂</Link>
        <div><strong>{demoEvent.name}</strong><span>מאשר תמונות</span></div>
        <button className="modIcon">☰</button>
      </header>
      <section className="moderatorStage">
        <div className="queueHeader">
          <span className="queueBadge">{total - processed} תמונות ממתינות לאישור</span>
          <span>{processed + 1} מתוך {total}</span>
        </div>
        <div className="moderationPhotoWrap">
          <img src={gallery[index]} alt="תמונה הממתינה לאישור" />
          <span className="photoAge">לפני 20 שניות</span>
        </div>
        <div className="progress"><span style={{ width: `${Math.min(100, ((processed + 1) / total) * 100)}%` }} /></div>
        <div className="decisionRow">
          <button className="decision reject" onClick={() => decide('rejected')}><b>×</b><span>דחה</span></button>
          <button className="decision private" onClick={() => decide('private')}><b>▣</b><span>פרטי</span></button>
          <button className="decision approve" onClick={() => decide('approved')}><b>✓</b><span>אשר</span></button>
        </div>
        <p className="swipeHint">אפשר לאשר מהר גם בהחלקה בגרסה המלאה</p>
        {decision && (
          <button className="undoToast" onClick={undo}>
            {decision === 'approved' ? 'התמונה אושרה' : decision === 'private' ? 'התמונה הועברה לפרטי' : 'התמונה נדחתה'} · <u>ביטול</u>
          </button>
        )}
      </section>
    </main>
  );
}
