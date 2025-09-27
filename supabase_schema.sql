-- Ejecuta esto en el SQL Editor de Supabase

create extension if not exists pgcrypto;

create table if not exists public.athletes (
  id uuid primary key default gen_random_uuid(),
  rut text not null unique,
  first_name text not null,
  last_name text not null,
  birthdate date,
  email text,
  phone text,
  created_at timestamptz default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  uid text not null unique,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  plan text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'active',
  created_at timestamptz default now()
);

do $$ begin
  create type public.access_result as enum ('allowed','denied','expired','unknown_card');
exception when duplicate_object then null; end $$;

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid references public.athletes(id) on delete set null,
  card_uid text,
  ts timestamptz not null default now(),
  result public.access_result not null,
  note text
);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  pdf_url text not null,
  is_public boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.routine_assignments (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  start_date date default now(),
  notes text
);

-- RLS
alter table public.routines enable row level security;
create policy if not exists "Public can read public routines"
on public.routines for select
to anon
using (is_public = true);

alter table public.athletes enable row level security;
alter table public.cards enable row level security;
alter table public.memberships enable row level security;
alter table public.access_logs enable row level security;

create policy if not exists "Admins only athletes"
on public.athletes for all to authenticated using (true) with check (true);

create policy if not exists "Admins only cards"
on public.cards for all to authenticated using (true) with check (true);

create policy if not exists "Admins only memberships"
on public.memberships for all to authenticated using (true) with check (true);

create policy if not exists "Admins only access_logs"
on public.access_logs for all to authenticated using (true) with check (true);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'media',
  path text not null unique,
  title text,
  alt text,
  tags text[] not null default '{}',
  width int,
  height int,
  format text,
  bytes int,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;

create policy if not exists "public_read_active_media"
on public.media_assets for select
  to public
  using (is_active = true);

create policy if not exists "authenticated_manage_media"
on public.media_assets for all
  to authenticated
  using (true)
  with check (true);

-- Storage bucket `media`
create policy if not exists "public_read_media_bucket"
on storage.objects for select
  to public
  using (bucket_id = 'media');

create policy if not exists "authenticated_manage_media_bucket"
on storage.objects for all
  to authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');
