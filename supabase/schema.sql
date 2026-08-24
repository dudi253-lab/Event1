-- Moments / Event Photo Platform — starter schema v0.1
-- Run later in a Supabase project after reviewing RLS and auth strategy.

create extension if not exists pgcrypto;

create type event_status as enum ('draft','ready','live','post_event','archived');
create type photo_status as enum ('pending','approved','private','rejected');
create type staff_role as enum ('photo_moderator');
create type company_role as enum ('company_admin');
create type access_type as enum ('qr','nfc','both');

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  pin_hash text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role company_role not null default 'company_admin',
  active boolean not null default true,
  unique(company_id,user_id)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  event_type text,
  event_date date,
  event_time time,
  location text,
  status event_status not null default 'draft',
  slug text not null unique,
  public_token text not null unique default encode(gen_random_bytes(12),'hex'),
  cover_image text,
  logo_url text,
  primary_color text not null default '#7c3aed',
  secondary_color text not null default '#f5f3ff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role staff_role not null default 'photo_moderator',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(event_id,user_id)
);

create table access_points (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  type access_type not null default 'both',
  token text not null unique default encode(gen_random_bytes(10),'hex'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table event_settings (
  event_id uuid primary key references events(id) on delete cascade,
  moderation_required boolean not null default true,
  uploads_enabled boolean not null default false,
  album_enabled boolean not null default true,
  downloads_enabled boolean not null default true,
  max_photos_per_upload integer not null default 20 check (max_photos_per_upload between 1 and 50),
  live_wall_enabled boolean not null default false,
  post_event_upload_days integer not null default 7 check (post_event_upload_days between 0 and 90),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  storage_path text not null,
  preview_path text,
  thumbnail_path text,
  original_filename text,
  mime_type text,
  file_size bigint,
  width integer,
  height integer,
  status photo_status not null default 'pending',
  access_point_id uuid references access_points(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderated_by uuid references users(id) on delete set null
);

create index photos_event_status_idx on photos(event_id,status,uploaded_at desc);
create index event_staff_user_idx on event_staff(user_id,event_id);
create index events_company_status_idx on events(company_id,status,event_date);

-- RLS will be enabled when the production auth model is connected.
-- The company admin and photo moderator roles must never rely on UI-only checks.
