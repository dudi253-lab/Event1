import { redirect } from 'next/navigation';
import { DEMO_EVENT_SLUG } from '@/lib/event-api';

export default function Home() {
  redirect(`/e/${DEMO_EVENT_SLUG}`);
}
