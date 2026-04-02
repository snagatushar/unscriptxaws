-- UNSCRIPTED fresh schema
-- Run this in the Supabase SQL editor on a clean project or after removing older conflicting objects.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'payment_reviewer', 'content_reviewer', 'user');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'submission_status') then
    create type public.submission_status as enum ('locked', 'ready', 'submitted');
  end if;

  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type public.review_status as enum ('not_started', 'selected', 'eliminated');
  end if;

  if not exists (select 1 from pg_type where typname = 'qualification_stage') then
    create type public.qualification_stage as enum ('not_started', 'round_1_qualified', 'round_2_qualified', 'semifinal', 'final', 'eliminated');
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null unique,
  phone text,
  college_name text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  category text not null,
  description text not null,
  rules text[] not null default '{}',
  image_url text,
  entry_fee numeric(10,2) not null default 0,
  max_team_size integer not null default 1,
  payment_account_name text,
  payment_account_number text,
  payment_ifsc text,
  payment_upi_id text,
  drive_folder_id text,
  drive_embed_hint text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  participant_name text,
  email text,
  phone text not null,
  college_name text,
  department text,
  year_of_study text,
  team_name text,
  team_size integer,
  team_members jsonb not null default '[]'::jsonb,
  payment_screenshot_url text not null,
  payment_notes text,
  payment_status public.payment_status not null default 'pending',
  payment_review_notes text,
  payment_reviewed_by uuid references public.users(id),
  payment_reviewed_at timestamptz,
  upload_enabled boolean not null default false,
  upload_enabled_by uuid references public.users(id),
  upload_enabled_at timestamptz,
  submission_status public.submission_status not null default 'locked',
  drive_file_id text,
  drive_view_url text,
  drive_download_url text,
  submission_notes text,
  submitted_at timestamptz,
  review_status public.review_status not null default 'not_started',
  qualification_stage public.qualification_stage not null default 'not_started',
  qualification_notes text,
  review_notes text,
  content_reviewed_by uuid references public.users(id),
  content_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registrations_unique_user_event unique (user_id, event_id)
);

create table if not exists public.reviewer_event_assignments (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint reviewer_event_unique unique (reviewer_id, event_id)
);

create table if not exists public.committee (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  image_url text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.faculty (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  designation text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.general_rules (
  id uuid primary key default gen_random_uuid(),
  rule_text text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.hero_slideshow (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  duration_seconds integer not null default 2,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  title text,
  subtitle text,
  body text,
  secondary_body text,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute procedure public.set_updated_at();

drop trigger if exists registrations_set_updated_at on public.registrations;
create trigger registrations_set_updated_at
before update on public.registrations
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin'
$$;

create or replace function public.is_payment_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'payment_reviewer')
$$;

create or replace function public.is_content_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'content_reviewer')
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'payment_reviewer', 'content_reviewer')
$$;

create or replace function public.can_review_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_role() = 'admin'
    or exists (
      select 1
      from public.reviewer_event_assignments rea
      where rea.reviewer_id = auth.uid()
        and rea.event_id = target_event_id
    )
$$;

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.reviewer_event_assignments enable row level security;
alter table public.committee enable row level security;
alter table public.faculty enable row level security;
alter table public.general_rules enable row level security;
alter table public.hero_slideshow enable row level security;
alter table public.site_content enable row level security;

drop policy if exists "users can read own profile" on public.users;
create policy "users can read own profile"
on public.users
for select
using (auth.uid() = id or public.is_staff());

drop policy if exists "admins can manage users" on public.users;
create policy "admins can manage users"
on public.users
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "public can read active events" on public.events;
create policy "public can read active events"
on public.events
for select
using (is_active = true or public.current_role() = 'admin');

drop policy if exists "admins manage events" on public.events;
create policy "admins manage events"
on public.events
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "users read own registrations" on public.registrations;
create policy "users read own registrations"
on public.registrations
for select
using (
  auth.uid() = user_id
  or public.is_payment_reviewer()
  or public.can_review_event(event_id)
);

drop policy if exists "users create own registrations" on public.registrations;
create policy "users create own registrations"
on public.registrations
for insert
with check (auth.uid() = user_id);

drop policy if exists "users update own unlocked registration fields" on public.registrations;
create policy "users update own unlocked registration fields"
on public.registrations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "payment reviewers manage registrations" on public.registrations;
create policy "payment reviewers manage registrations"
on public.registrations
for update
using (public.is_payment_reviewer())
with check (public.is_payment_reviewer());

drop policy if exists "content reviewers manage assigned registrations" on public.registrations;
create policy "content reviewers manage assigned registrations"
on public.registrations
for update
using (public.can_review_event(event_id))
with check (public.can_review_event(event_id));

drop policy if exists "admins delete registrations" on public.registrations;
create policy "admins delete registrations"
on public.registrations
for delete
using (public.is_admin());

create or replace function public.guard_registration_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role public.app_role;
begin
  actor_role := public.current_role();

  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if new.user_id <> old.user_id then
    raise exception 'user_id cannot be changed';
  end if;

  if new.event_id <> old.event_id then
    raise exception 'event_id cannot be changed';
  end if;

  if new.created_at <> old.created_at then
    raise exception 'created_at cannot be changed';
  end if;

  if auth.uid() = old.user_id and actor_role = 'user' then
    if new.payment_status <> old.payment_status
      or new.payment_review_notes is distinct from old.payment_review_notes
      or new.payment_reviewed_by is distinct from old.payment_reviewed_by
      or new.payment_reviewed_at is distinct from old.payment_reviewed_at
      or new.upload_enabled <> old.upload_enabled
      or new.upload_enabled_by is distinct from old.upload_enabled_by
      or new.upload_enabled_at is distinct from old.upload_enabled_at
      or new.qualification_stage <> old.qualification_stage
      or new.qualification_notes is distinct from old.qualification_notes
      or new.review_status <> old.review_status
      or new.review_notes is distinct from old.review_notes
      or new.content_reviewed_by is distinct from old.content_reviewed_by
      or new.content_reviewed_at is distinct from old.content_reviewed_at then
      raise exception 'Users cannot update review or approval fields';
    end if;

    if old.upload_enabled = false and (
      new.drive_file_id is distinct from old.drive_file_id
      or new.drive_view_url is distinct from old.drive_view_url
      or new.drive_download_url is distinct from old.drive_download_url
      or new.submission_notes is distinct from old.submission_notes
      or new.submission_status <> old.submission_status
      or new.submitted_at is distinct from old.submitted_at
    ) then
      raise exception 'Upload is not enabled for this event';
    end if;

    if new.payment_screenshot_url <> old.payment_screenshot_url then
      raise exception 'Payment screenshot cannot be changed after registration';
    end if;

    return new;
  end if;

  if actor_role in ('admin', 'payment_reviewer') then
    if new.review_status <> old.review_status
      or new.qualification_stage <> old.qualification_stage
      or new.qualification_notes is distinct from old.qualification_notes
      or new.review_notes is distinct from old.review_notes
      or new.content_reviewed_by is distinct from old.content_reviewed_by
      or new.content_reviewed_at is distinct from old.content_reviewed_at then
      raise exception 'Payment reviewers cannot change qualification or content review fields';
    end if;

    return new;
  end if;

  if public.can_review_event(old.event_id) then
    if new.payment_status <> old.payment_status
      or new.payment_review_notes is distinct from old.payment_review_notes
      or new.payment_reviewed_by is distinct from old.payment_reviewed_by
      or new.payment_reviewed_at is distinct from old.payment_reviewed_at
      or new.upload_enabled <> old.upload_enabled
      or new.upload_enabled_by is distinct from old.upload_enabled_by
      or new.upload_enabled_at is distinct from old.upload_enabled_at then
      raise exception 'Content reviewers cannot change payment approval fields';
    end if;

    return new;
  end if;

  raise exception 'You do not have permission to update this registration';
end;
$$;

drop trigger if exists registrations_guard_update on public.registrations;
create trigger registrations_guard_update
before update on public.registrations
for each row execute procedure public.guard_registration_update();

create or replace function public.get_public_event_results(target_event_id uuid)
returns table (
  participant_name text,
  team_name text,
  qualification_stage public.qualification_stage
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(r.participant_name, u.full_name, u.email) as participant_name,
    r.team_name,
    r.qualification_stage
  from public.registrations r
  left join public.users u on u.id = r.user_id
  where r.event_id = target_event_id
    and r.qualification_stage <> 'not_started'
  order by r.created_at asc
$$;

drop policy if exists "admins manage reviewer assignments" on public.reviewer_event_assignments;
create policy "admins manage reviewer assignments"
on public.reviewer_event_assignments
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "reviewers can read their assignments" on public.reviewer_event_assignments;
create policy "reviewers can read their assignments"
on public.reviewer_event_assignments
for select
using (reviewer_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "public read committee" on public.committee;
create policy "public read committee"
on public.committee
for select
using (true);

drop policy if exists "admin manage committee" on public.committee;
create policy "admin manage committee"
on public.committee
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "public read faculty" on public.faculty;
create policy "public read faculty"
on public.faculty
for select
using (true);

drop policy if exists "admin manage faculty" on public.faculty;
create policy "admin manage faculty"
on public.faculty
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "public read general rules" on public.general_rules;
create policy "public read general rules"
on public.general_rules
for select
using (true);

drop policy if exists "admin manage general rules" on public.general_rules;
create policy "admin manage general rules"
on public.general_rules
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "public read hero slideshow" on public.hero_slideshow;
create policy "public read hero slideshow"
on public.hero_slideshow
for select
using (true);

drop policy if exists "admin manage hero slideshow" on public.hero_slideshow;
create policy "admin manage hero slideshow"
on public.hero_slideshow
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

drop policy if exists "public read site content" on public.site_content;
create policy "public read site content"
on public.site_content
for select
using (true);

drop policy if exists "admin manage site content" on public.site_content;
create policy "admin manage site content"
on public.site_content
for all
using (public.current_role() = 'admin')
with check (public.current_role() = 'admin');

insert into storage.buckets (id, name, public)
values ('payments', 'payments', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('hero', 'hero', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('faculty', 'faculty', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('committee', 'committee', true)
on conflict (id) do nothing;

update storage.buckets
set public = false
where id = 'payments';

drop policy if exists "public read payments bucket" on storage.objects;
drop policy if exists "users read own payment screenshots" on storage.objects;
create policy "users read own payment screenshots"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'payments'
  and (
    split_part(name, '_', 1) = auth.uid()::text
    or public.is_payment_reviewer()
  )
);

drop policy if exists "authenticated upload payments bucket" on storage.objects;
create policy "authenticated upload payments bucket"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'payments'
  and split_part(name, '_', 1) = auth.uid()::text
);

drop policy if exists "admin manage assets buckets" on storage.objects;
create policy "admin manage assets buckets"
on storage.objects
for all
to authenticated
using (
  bucket_id in ('assets', 'hero', 'faculty', 'committee')
  and public.current_role() = 'admin'
)
with check (
  bucket_id in ('assets', 'hero', 'faculty', 'committee')
  and public.current_role() = 'admin'
);
