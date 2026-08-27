begin;
create extension if not exists pgcrypto;

do $$ begin create type public.event_state as enum ('draft','ready','live','post_event','archived'); exception when duplicate_object then null; end $$;
do $$ begin create type public.photo_status as enum ('pending','approved','private','rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.staff_role as enum ('company_admin','photo_moderator'); exception when duplicate_object then null; end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(), name text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.staff_role not null check (role='company_admin'),
  primary key(company_id,user_id)
);
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'), name text not null,
  state public.event_state not null default 'draft', cover_path text,
  starts_at timestamptz, ends_at timestamptz, uploads_enabled boolean not null default false,
  album_enabled boolean not null default true, credential_version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create table if not exists public.event_credentials (
  event_id uuid primary key references public.events(id) on delete cascade,
  pin_salt text not null, pin_hash text not null, updated_at timestamptz not null default now()
);
create table if not exists public.staff_sessions (
  id uuid primary key default gen_random_uuid(), token_hash text not null unique,
  role public.staff_role not null, user_id uuid references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  credential_version integer not null, expires_at timestamptz not null,
  created_at timestamptz not null default now(), revoked_at timestamptz,
  check ((role='company_admin' and user_id is not null) or (role='photo_moderator' and event_id is not null))
);
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  storage_path text not null unique, original_filename text, mime_type text not null,
  file_size bigint not null check(file_size > 0 and file_size <= 20971520),
  status public.photo_status not null default 'pending', uploaded_at timestamptz not null default now(),
  moderated_at timestamptz, moderated_by uuid references auth.users(id),
  check (storage_path like 'events/' || event_id::text || '/pending/%')
);
create table if not exists public.moderation_log (
  id bigint generated always as identity primary key, event_id uuid not null references public.events(id) on delete cascade,
  photo_id uuid not null references public.photos(id) on delete cascade,
  from_status public.photo_status not null, to_status public.photo_status not null,
  actor_role public.staff_role not null, actor_user_id uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.rate_limits (
  scope text not null, subject_hash text not null, window_start timestamptz not null,
  attempts integer not null default 1, locked_until timestamptz,
  primary key(scope,subject_hash,window_start)
);
create index if not exists photos_feed_idx on public.photos(event_id,status,uploaded_at desc);
create index if not exists sessions_lookup_idx on public.staff_sessions(token_hash,expires_at) where revoked_at is null;

create or replace function public.rotate_event_pin(p_event_id uuid,p_salt text,p_hash text)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_version integer;
begin
  update public.events set credential_version=credential_version+1,updated_at=now()
  where id=p_event_id returning credential_version into v_version;
  if v_version is null then raise exception 'event_not_found'; end if;
  insert into public.event_credentials(event_id,pin_salt,pin_hash,updated_at)
  values(p_event_id,p_salt,p_hash,now()) on conflict(event_id) do update
  set pin_salt=excluded.pin_salt,pin_hash=excluded.pin_hash,updated_at=excluded.updated_at;
  update public.staff_sessions set revoked_at=now()
  where event_id=p_event_id and role='photo_moderator' and revoked_at is null;
  return v_version;
end $$;
revoke all on function public.rotate_event_pin(uuid,text,text) from public,anon,authenticated;
grant execute on function public.rotate_event_pin(uuid,text,text) to service_role;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.events enable row level security;
alter table public.event_credentials enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.photos enable row level security;
alter table public.moderation_log enable row level security;
alter table public.rate_limits enable row level security;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to service_role;
grant select,insert,update,delete on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('event-photos','event-photos',false,20971520,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('event-assets','event-assets',false,20971520,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

-- No anon/authenticated Storage policy is intentional. Uploads use one-time signed upload tokens;
-- reads use short-lived signed URLs created only by authenticated server routes.
commit;
