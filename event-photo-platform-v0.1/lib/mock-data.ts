export type EventStatus = 'draft' | 'ready' | 'live' | 'post_event' | 'archived';

export type EventItem = {
  id: string;
  name: string;
  type: string;
  date: string;
  status: EventStatus;
  photos: number;
  pending: number;
  coverImage: string;
  primaryColor: string;
  secondaryColor: string;
};

export const demoEvent: EventItem = {
  id: 'demo-event',
  name: 'דודי & אקה',
  type: 'חתונה',
  date: '25.06.2027',
  status: 'live',
  photos: 438,
  pending: 17,
  coverImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=85',
  primaryColor: '#7c3aed',
  secondaryColor: '#f5f3ff',
};

export const events: EventItem[] = [
  demoEvent,
  {
    id: 'bar-mitzvah-omer',
    name: 'בר המצווה של עומר',
    type: 'בר מצווה',
    date: '28.06.2027',
    status: 'ready',
    photos: 0,
    pending: 0,
    coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
    primaryColor: '#2563eb',
    secondaryColor: '#eff6ff',
  },
  {
    id: 'abc-summer',
    name: 'ABC Summer Event',
    type: 'אירוע חברה',
    date: '03.07.2027',
    status: 'draft',
    photos: 0,
    pending: 0,
    coverImage: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=80',
    primaryColor: '#0f766e',
    secondaryColor: '#f0fdfa',
  },
];

export const gallery = [
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=700&q=82',
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=82',
  'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=700&q=82',
  'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=700&q=82',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=700&q=82',
  'https://images.unsplash.com/photo-1507501336603-6e31db2be093?auto=format&fit=crop&w=700&q=82'
];
