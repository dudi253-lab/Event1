export type PhotoStatus = 'pending' | 'approved' | 'private' | 'rejected';
export type EventState = 'draft' | 'ready' | 'live' | 'post_event' | 'archived';
export type StaffRole = 'company_admin' | 'photo_moderator';
export type EventPublic = { id:string; company_id?:string; slug:string; name:string; event_type:string|null; location:string|null; cover_path:string|null; state:EventState; starts_at:string|null; ends_at:string|null; uploads_enabled:boolean; album_enabled:boolean; primary_color:string; secondary_color:string; timezone:string; max_photos_per_upload:number };
