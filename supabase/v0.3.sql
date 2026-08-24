-- Digi v0.3
-- Run AFTER schema.sql and v0.2.sql.

create extension if not exists pgcrypto;

-- Brand the demo company as Digi.
update public.companies
set name = 'Digi'
where id = '00000000-0000-0000-0000-000000000001';

-- v0.3 PINs: manager 2503, bridesmaids 1234.
update public.users
set pin_hash = crypt('2503', gen_salt('bf')),
    active = true
where id = '00000000-0000-0000-0000-00000000a001';

update public.users
set pin_hash = crypt('1234', gen_salt('bf')),
    active = true
where id = '00000000-0000-0000-0000-00000000a002';

-- PIN-only login. The phone number is no longer required by the v0.3 UI.
create or replace function public.staff_pin_login(
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
begin
  if p_pin !~ '^\d{4}$' then
    raise exception 'הקוד אינו נכון';
  end if;

  delete from public.staff_sessions where expires_at < now();

  if p_role = 'company_admin' then
    select u.*
    into v_user
    from public.users u
    join public.company_users cu on cu.user_id = u.id and cu.active = true
    join public.events e on e.company_id = cu.company_id
    where e.id = p_event_id
      and u.active = true
      and u.pin_hash is not null
      and crypt(p_pin, u.pin_hash) = u.pin_hash
    limit 1;
  elsif p_role = 'photo_moderator' then
    select u.*
    into v_user
    from public.users u
    join public.event_staff es on es.user_id = u.id and es.active = true
    where es.event_id = p_event_id
      and u.active = true
      and u.pin_hash is not null
      and crypt(p_pin, u.pin_hash) = u.pin_hash
    limit 1;
  else
    raise exception 'תפקיד לא תקין';
  end if;

  if v_user.id is null then
    raise exception 'הקוד אינו נכון';
  end if;

  insert into public.staff_sessions (token, user_id, event_id, role)
  values (v_token, v_user.id, p_event_id, p_role);

  return query
  select v_token, v_user.id, v_user.name, p_role;
end;
$$;

grant execute on function public.staff_pin_login(text, text, uuid) to anon, authenticated;

-- Keep the old phone+PIN RPC for v0.2 rollback compatibility.
-- v0.3 itself only calls staff_pin_login.

-- Ensure the demo access point exists for QR/NFC administration.
insert into public.access_points (event_id, name, type, active)
select
  '00000000-0000-0000-0000-000000001001'::uuid,
  'Digi QR / NFC',
  'both'::access_type,
  true
where not exists (
  select 1
  from public.access_points
  where event_id = '00000000-0000-0000-0000-000000001001'::uuid
    and name = 'Digi QR / NFC'
);
