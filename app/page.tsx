import Link from 'next/link';
import { Logo } from '@/components/Logo';

const areas = [
  {
    title: 'ממשק אורח',
    text: 'כניסה מ־QR/NFC, העלאת תמונות וצפייה באלבום המאושר.',
    href: '/e/demo-event',
    icon: '📸',
    meta: 'Mobile first',
  },
  {
    title: 'מאשר תמונות',
    text: 'תור אישורים מהיר מהטלפון: אישור, דחייה או שמירה פרטית.',
    href: '/moderator',
    icon: '✓',
    meta: 'Moderator',
  },
  {
    title: 'נציג החברה',
    text: 'Back Office לניהול אירועים, מיתוג, מאשרים, QR/NFC והגדרות.',
    href: '/admin',
    icon: '◫',
    meta: 'Company admin',
  },
];

export default function Home() {
  return (
    <main className="hubPage">
      <section className="hubHero">
        <Logo />
        <span className="eyebrow">Starter v0.1</span>
        <h1>שלוש סביבות. מוצר אחד.</h1>
        <p>גרסת הדמו הראשונה של פלטפורמת התמונות לאירועים.</p>
      </section>
      <section className="areaGrid" aria-label="בחירת ממשק">
        {areas.map((area) => (
          <Link className="areaCard" href={area.href} key={area.href}>
            <div className="areaIcon">{area.icon}</div>
            <div>
              <span className="areaMeta">{area.meta}</span>
              <h2>{area.title}</h2>
              <p>{area.text}</p>
            </div>
            <span className="areaArrow">←</span>
          </Link>
        ))}
      </section>
      <div className="hubNote">הגרסה הזו עובדת עם נתוני דמה ומוכנה לחיבור ל־Supabase בשלב הבא.</div>
    </main>
  );
}
