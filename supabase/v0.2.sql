-- Moments v0.2
-- Run this AFTER the v0.2 foundation schema already created in Supabase.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Demo event and test staff
-- ---------------------------------------------------------

update public.events
set
  name = 'דודי & אקה',
  event_type = 'חתונה',
  status = 'live',
  cover_image = coalesce(
    cover_image,
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=85'
  )
where id = '00000000-0000-0000-0000-000000001001';

insert into public.users (id, name, phone, pin_hash, active)
values
(
  '00000000-0000-0000-0000-00000000a001',
  'מנהל מערכת',
  '0500000000',
  crypt('1234', gen_salt('bf')),
  true
)
on conflict (id) do update
set name = excluded.name,
    phone = excluded.phone,
    pin_hash = excluded.pin_hash,
    active = true;

insert into public.users (id, name, phone, pin_hash, active)
values
(
  '00000000-0000-0000-0000-00000000a002',
  'שושבינה',
  '0500000001',
  crypt('1234', gen_salt('bf')),
  true
)
on conflict (id) do update
set name = excluded.name,
    phone = excluded.phone,
    pin_hash = excluded.pin_hash,
    active = true;

insert into public.company_users (company_id, user_id, role, active)
values
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-00000000a001',
  'company_admin',
  true
)
on conflict (company_id, user_id) do update set active = true;

insert into public.event_staff (event_id, user_id, role, active)
values
(
  '00000000-0000-0000-0000-000000001001',
  '00000000-0000-0000-0000-00000000a002',
  'photo_moderator',
  true
)
on conflict (event_id, user_id) do update set active = true;

-- ---------------------------------------------------------
-- Staff session tokens
-- ---------------------------------------------------------

create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  role text not null check (role in ('company_admin', 'photo_moderator')),
  expires_at timestamptz not null default (now() + interval '12 hours'),
  created_at timestamptz not null default now()
);

alter table public.staff_sessions enable row level security;
revoke all on public.staff_sessions from anon, authenticated;

create or replace function public.staff_login(
  p_phone text,
  p_pin text,
  p_role text,
  p_event_id uuid
)
returns table (
  token uuid,
  user_id uuid,
  user_name text,
  role text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.users%rowtype;
  v_token uuid := gen_random_uuid();
  v_allowed boolean := false;
begin
  delete from public.staff_sessions where expires_at < now();

  select *
  into v_user
  from public.users u
  where regexp_replace(u.phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
    and u.active = true
  limit 1;

  if v_user.id is null
     or v_user.pin_hash is null
     or crypt(p_pin, v_user.pin_hash) <> v_user.pin_hash then
    raise exception 'פרטי הכניסה אינם נכונים';
  end if;

  if p_role = 'company_admin' then
    select exists (
      select 1
      from public.company_users cu
      join public.events e on e.company_id = cu.company_id
      where cu.user_id = v_user.id
        and cu.active = true
        and e.id = p_event_id
    ) into v_allowed;
  elsif p_role = 'photo_moderator' then
    select exists (
      select 1
      from public.event_staff es
      where es.user_id = v_user.id
        and es.event_id = p_event_id
        and es.active = true
    ) into v_allowed;
  end if;

  if not v_allowed then
    raise exception 'אין הרשאה לאירוע הזה';
  end if;

  insert into public.staff_sessions (token, user_id, event_id, role)
  values (v_token, v_user.id, p_event_id, p_role);

  return query
  select v_token, v_user.id, v_user.name, p_role;
end;
$$;

create or replace function public.valid_staff_session(
  p_token uuid,
  p_event_id uuid,
  p_roles text[]
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_sessions s
    join public.users u on u.id = s.user_id
    where s.token = p_token
      and s.event_id = p_event_id
      and s.role = any(p_roles)
      and s.expires_at > now()
      and u.active = true
  );
$$;

revoke all on function public.valid_staff_session(uuid, uuid, text[]) from public, anon, authenticated;

-- ---------------------------------------------------------
-- Admin branding mutation
-- ---------------------------------------------------------

create or replace function public.update_event_branding(
  p_token uuid,
  p_event_id uuid,
  p_name text,
  p_event_type text,
  p_cover_image text default null
)
returns setof public.events
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.valid_staff_session(p_token, p_event_id, array['company_admin']) then
    raise exception 'אין הרשאת מנהל';
  end if;

  return query
  update public.events
  set
    name = left(coalesce(nullif(trim(p_name), ''), name), 80),
    event_type = left(coalesce(nullif(trim(p_event_type), ''), event_type, 'אירוע'), 50),
    cover_image = coalesce(nullif(trim(p_cover_image), ''), cover_image)
  where id = p_event_id
  returning *;
end;
$$;

-- ---------------------------------------------------------
-- Moderator reads and mutations
-- ---------------------------------------------------------

create or replace function public.list_pending_photos(
  p_token uuid,
  p_event_id uuid
)
returns table (
  id uuid,
  event_id uuid,
  storage_path text,
  original_filename text,
  mime_type text,
  file_size bigint,
  status photo_status,
  uploaded_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.valid_staff_session(
    p_token,
    p_event_id,
    array['photo_moderator', 'company_admin']
  ) then
    raise exception 'אין הרשאה לתמונות האירוע';
  end if;

  return query
  select
    p.id,
    p.event_id,
    p.storage_path,
    p.original_filename,
    p.mime_type,
    p.file_size,
    p.status,
    p.uploaded_at
  from public.photos p
  where p.event_id = p_event_id
    and p.status = 'pending'
  order by p.uploaded_at asc;
end;
$$;

create or replace function public.moderate_photo(
  p_token uuid,
  p_photo_id uuid,
  p_status photo_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_user_id uuid;
begin
  if p_status not in ('pending', 'approved', 'private', 'rejected') then
    raise exception 'סטטוס לא תקין';
  end if;

  select event_id into v_event_id
  from public.photos
  where id = p_photo_id;

  if v_event_id is null then
    raise exception 'התמונה לא נמצאה';
  end if;

  if not public.valid_staff_session(
    p_token,
    v_event_id,
    array['photo_moderator', 'company_admin']
  ) then
    raise exception 'אין הרשאה לתמונה הזו';
  end if;

  select user_id into v_user_id
  from public.staff_sessions
  where token = p_token
    and expires_at > now()
  limit 1;

  update public.photos
  set
    status = p_status,
    moderated_at = case when p_status = 'pending' then null else now() end,
    moderated_by = case when p_status = 'pending' then null else v_user_id end
  where id = p_photo_id;
end;
$$;

create or replace function public.event_stats(
  p_token uuid,
  p_event_id uuid
)
returns table (
  total bigint,
  pending bigint,
  approved bigint,
  private_count bigint,
  rejected bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.valid_staff_session(
    p_token,
    p_event_id,
    array['photo_moderator', 'company_admin']
  ) then
    raise exception 'אין הרשאה לנתוני האירוע';
  end if;

  return query
  select
    count(*)::bigint,
    count(*) filter (where p.status = 'pending')::bigint,
    count(*) filter (where p.status = 'approved')::bigint,
    count(*) filter (where p.status = 'private')::bigint,
    count(*) filter (where p.status = 'rejected')::bigint
  from public.photos p
  where p.event_id = p_event_id;
end;
$$;

grant execute on function public.staff_login(text, text, text, uuid) to anon, authenticated;
grant execute on function public.update_event_branding(uuid, uuid, text, text, text) to anon, authenticated;
grant execute on function public.list_pending_photos(uuid, uuid) to anon, authenticated;
grant execute on function public.moderate_photo(uuid, uuid, photo_status) to anon, authenticated;
grant execute on function public.event_stats(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------
-- Guest upload permissions
-- ---------------------------------------------------------

grant insert on public.photos to anon, authenticated;

drop policy if exists guest_insert_pending_photos on public.photos;
create policy guest_insert_pending_photos
on public.photos
for insert
to anon, authenticated
with check (
  status = 'pending'
  and exists (
    select 1
    from public.events e
    join public.event_settings s on s.event_id = e.id
    where e.id = photos.event_id
      and e.status in ('ready', 'live', 'post_event')
      and s.uploads_enabled = true
  )
);

-- Public object URLs are used in v0.2. Database rows still decide
-- which photos appear in the public album.
update storage.buckets
set public = true
where id in ('event-assets', 'event-photos');

drop policy if exists guest_upload_event_photos on storage.objects;
create policy guest_upload_event_photos
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'event-photos');

drop policy if exists staff_upload_event_assets on storage.objects;
create policy staff_upload_event_assets
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'event-assets');

-- Ensure realtime publications include both synced entities.
alter table public.events replica identity full;
alter table public.photos replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime'
        and schemaname='public'
        and tablename='events'
    ) then
      alter publication supabase_realtime add table public.events;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime'
        and schemaname='public'
        and tablename='photos'
    ) then
      alter publication supabase_realtime add table public.photos;
    end if;
  end if;
end $$;
