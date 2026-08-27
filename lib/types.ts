export type PhotoStatus = 'pending' | 'approved' | 'private' | 'rejected';
export type EventState = 'draft' | 'ready' | 'live' | 'post_event' | 'archived';
export type StaffRole = 'company_admin' | 'photo_moderator';
export type EventPublic = { id:string; slug:string; name:string; cover_path:string|null; state:EventState; starts_at:string|null; ends_at:string|null; uploads_enabled:boolean; album_enabled:boolean };
