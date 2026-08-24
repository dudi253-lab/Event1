import { supabase } from '@/lib/supabase';

export const DEMO_EVENT_SLUG = 'demo-event';

export type EventRow = {
  id: string;
  company_id: string;
  name: string;
  event_type: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  status: 'draft' | 'ready' | 'live' | 'post_event' | 'archived';
  slug: string;
  cover_image: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  updated_at: string;
};

export type PhotoRow = {
  id: string;
  event_id: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  status: 'pending' | 'approved' | 'private' | 'rejected';
  uploaded_at: string;
};

export type StaffRole = 'company_admin' | 'photo_moderator';

export type StaffSession = {
  token: string;
  user_id: string;
  user_name: string;
  role: StaffRole;
};

export type EventStats = {
  total: number;
  pending: number;
  approved: number;
  private_count: number;
  rejected: number;
};

export async function getEventBySlug(slug = DEMO_EVENT_SLUG) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as EventRow;
}

export async function getApprovedPhotos(eventId: string) {
  const { data, error } = await supabase
    .from('photos')
    .select('id,event_id,storage_path,original_filename,mime_type,file_size,status,uploaded_at')
    .eq('event_id', eventId)
    .eq('status', 'approved')
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PhotoRow[];
}

export function publicPhotoUrl(path: string, bucket = 'event-photos') {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function safeFileName(name: string) {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(-120);
  return cleaned || 'photo.jpg';
}

export async function uploadGuestPhotos(eventId: string, files: File[]) {
  const batch = files.slice(0, 20);
  let uploaded = 0;

  for (const file of batch) {
    const path = `events/${eventId}/pending/${crypto.randomUUID()}-${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from('event-photos')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) throw uploadError;

    const { error: rowError } = await supabase.from('photos').insert({
      event_id: eventId,
      storage_path: path,
      original_filename: file.name,
      mime_type: file.type || null,
      file_size: file.size,
      status: 'pending',
    });

    if (rowError) throw rowError;
    uploaded += 1;
  }

  return uploaded;
}

export async function uploadEventCover(eventId: string, file: File) {
  const path = `events/${eventId}/covers/${crypto.randomUUID()}-${safeFileName(file.name)}`;

  const { error } = await supabase.storage.from('event-assets').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) throw error;
  return publicPhotoUrl(path, 'event-assets');
}

export async function staffLogin(pin: string, role: StaffRole, eventId: string) {
  const { data, error } = await supabase.rpc('staff_pin_login', {
    p_pin: pin,
    p_role: role,
    p_event_id: eventId,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.token) throw new Error('הקוד אינו נכון.');

  return row as StaffSession;
}

export async function updateEventBranding(
  token: string,
  eventId: string,
  values: { name: string; eventType: string; coverImage?: string | null },
) {
  const { data, error } = await supabase.rpc('update_event_branding', {
    p_token: token,
    p_event_id: eventId,
    p_name: values.name,
    p_event_type: values.eventType,
    p_cover_image: values.coverImage ?? null,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as EventRow;
}

export async function listPendingPhotos(token: string, eventId: string) {
  const { data, error } = await supabase.rpc('list_pending_photos', {
    p_token: token,
    p_event_id: eventId,
  });

  if (error) throw error;
  return (data ?? []) as PhotoRow[];
}

export async function moderatePhoto(
  token: string,
  photoId: string,
  status: 'pending' | 'approved' | 'private' | 'rejected',
) {
  const { error } = await supabase.rpc('moderate_photo', {
    p_token: token,
    p_photo_id: photoId,
    p_status: status,
  });
  if (error) throw error;
}

export async function getEventStats(token: string, eventId: string) {
  const { data, error } = await supabase.rpc('event_stats', {
    p_token: token,
    p_event_id: eventId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row ?? {
    total: 0,
    pending: 0,
    approved: 0,
    private_count: 0,
    rejected: 0,
  }) as EventStats;
}
