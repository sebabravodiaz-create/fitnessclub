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
  created_at timestamptz default now(),
  photo_url text
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

create table if not exists public.membership_audit_logs (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid references public.memberships(id) on delete set null,
  athlete_id uuid references public.athletes(id) on delete set null,
  action text not null,
  performed_by uuid references auth.users(id) on delete set null,
  changes jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.login_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  success boolean not null,
  failure_reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
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
alter table public.membership_audit_logs enable row level security;
alter table public.login_logs enable row level security;

create policy if not exists "Admins only athletes"
on public.athletes for all to authenticated using (true) with check (true);

create policy if not exists "Admins only cards"
on public.cards for all to authenticated using (true) with check (true);

create policy if not exists "Admins only memberships"
on public.memberships for all to authenticated using (true) with check (true);

create policy if not exists "Admins only access_logs"
on public.access_logs for all to authenticated using (true) with check (true);

create policy if not exists "Admins read membership audit"
on public.membership_audit_logs for select to authenticated using (true);

create policy if not exists "Admins insert membership audit"
on public.membership_audit_logs for insert to authenticated with check (true);

create policy if not exists "Admins read login logs"
on public.login_logs for select to authenticated using (true);

create or replace function public.log_membership_audit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor uuid := auth.uid();
  payload jsonb;
  membership uuid;
  athlete uuid;
begin
  if (TG_OP = 'INSERT') then
    payload := jsonb_build_object('new', to_jsonb(NEW));
    membership := NEW.id;
    athlete := NEW.athlete_id;
  elsif (TG_OP = 'UPDATE') then
    payload := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    membership := NEW.id;
    athlete := NEW.athlete_id;
  elsif (TG_OP = 'DELETE') then
    payload := jsonb_build_object('old', to_jsonb(OLD));
    membership := OLD.id;
    athlete := OLD.athlete_id;
  else
    return null;
  end if;

  insert into public.membership_audit_logs (membership_id, athlete_id, action, performed_by, changes)
  values (membership, athlete, TG_OP, actor, payload);

  if (TG_OP = 'DELETE') then
    return OLD;
  end if;
  return NEW;
end;
$$;

drop trigger if exists tr_memberships_audit on public.memberships;

create trigger tr_memberships_audit
after insert or update or delete on public.memberships
for each row execute function public.log_membership_audit();

-- Storage bucket para fotos de deportistas
-- En Supabase Studio > Storage, crea (si no existe) un bucket llamado "athlete-photos"
-- con acceso público para que las URL generadas funcionen en el kiosk.
