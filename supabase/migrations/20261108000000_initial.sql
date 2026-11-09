-- AnimalEye: initial schema.
--   profiles              one row per user (anonymous or permanent); admin flag
--   identification_usage  per-user daily counter for the identification limit
--   identifications       every identification request and the model's answer
--
-- Writes to identifications and usage happen only through the `identify` Edge Function
-- (service role). Users can read their own rows; nobody can write them from the app.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

comment on column public.profiles.is_admin is
  'Admins have no daily identification limit. Set by hand: update public.profiles set is_admin = true where id = ''<user id>'';';

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- Create a profile for every new auth user (including anonymous ones).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Daily identification limit
-- ---------------------------------------------------------------------------

create table public.identification_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  used integer not null default 0 check (used >= 0),
  primary key (user_id, usage_date)
);

alter table public.identification_usage enable row level security;

create policy "Users can read their own usage"
  on public.identification_usage for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Atomically counts one identification against today's (UTC) limit.
-- Returns {allowed, used, limit, isAdmin, resetAt}. Failed attempts count too:
-- the function is called before the provider is contacted.
create function public.consume_identification(p_user_id uuid, p_limit integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_reset timestamptz := ((now() at time zone 'utc')::date + 1)::timestamp at time zone 'utc';
  v_is_admin boolean;
  v_used integer;
begin
  select coalesce(p.is_admin, false) into v_is_admin from public.profiles p where p.id = p_user_id;
  v_is_admin := coalesce(v_is_admin, false);

  if v_is_admin then
    insert into public.identification_usage as u (user_id, usage_date, used)
    values (p_user_id, v_today, 1)
    on conflict (user_id, usage_date) do update set used = u.used + 1
    returning u.used into v_used;
    return jsonb_build_object('allowed', true, 'used', v_used, 'limit', null, 'isAdmin', true, 'resetAt', v_reset);
  end if;

  insert into public.identification_usage as u (user_id, usage_date, used)
  values (p_user_id, v_today, 1)
  on conflict (user_id, usage_date) do update set used = u.used + 1
    where u.used < p_limit
  returning u.used into v_used;

  if v_used is null then
    -- Over the limit: nothing was updated.
    select u.used into v_used from public.identification_usage u
    where u.user_id = p_user_id and u.usage_date = v_today;
    return jsonb_build_object('allowed', false, 'used', coalesce(v_used, p_limit), 'limit', p_limit, 'isAdmin', false, 'resetAt', v_reset);
  end if;

  return jsonb_build_object('allowed', true, 'used', v_used, 'limit', p_limit, 'isAdmin', false, 'resetAt', v_reset);
end;
$$;

revoke execute on function public.consume_identification(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_identification(uuid, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Identifications: the model's answer, stored server-side so it can be compared with
-- users' corrections later (corrections sync in milestone 2).
-- ---------------------------------------------------------------------------

create table public.identifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  provider text not null,
  model text,
  status text not null check (status in ('ok', 'no_animal', 'error')),
  -- The provider's answer, normalized to the IdentificationResult contract.
  result jsonb,
  error_code text,
  latency_ms integer,
  -- SHA-256 of the submitted image, to spot duplicate submissions without storing the image.
  image_sha256 text
);

create index identifications_user_created_idx on public.identifications (user_id, created_at desc);

alter table public.identifications enable row level security;

create policy "Users can read their own identifications"
  on public.identifications for select
  to authenticated
  using (user_id = (select auth.uid()));
