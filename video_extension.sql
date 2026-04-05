-- 1. Update Qualification Stages Enum
-- In Supabase SQL editor, you can run this. Note: you cannot add values to enum inside a transaction in standard Postgres.
-- If this fails, run it separately.

DO $$
BEGIN
    ALTER TYPE public.qualification_stage ADD VALUE IF NOT EXISTS 'round_3_qualified';
    ALTER TYPE public.qualification_stage ADD VALUE IF NOT EXISTS 'winner';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create Videos Bucket
insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

-- 3. Create Submissions Table
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  round public.qualification_stage not null,
  video_url text not null, -- public view URL or path
  video_path text not null, -- storage internal path
  notes text,
  admin_notes text,
  score numeric(5,2),
  status public.submission_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint submissions_unique_round unique (registration_id, round)
);

-- 4. Enable RLS on Submissions
alter table public.submissions enable row level security;

-- 5. Submissions Policies
create policy "Users can read their own submissions"
on public.submissions for select
to authenticated
using (
  exists (
    select 1 from public.registrations r
    where r.id = submissions.registration_id
    and r.user_id = auth.uid()
  )
  or public.is_staff()
);

create policy "Users can upload their own submissions"
on public.submissions for insert
to authenticated
with check (
  exists (
    select 1 from public.registrations r
    where r.id = submissions.registration_id
    and r.user_id = auth.uid()
    and r.payment_status = 'approved'
  )
);

-- 6. Storage Policies for Videos
create policy "Users can upload their own videos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'videos'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "Users can read their own videos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'videos'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.is_staff()
  )
);

-- 7. Insert the 22 events
INSERT INTO public.events (title, category, description, entry_fee, is_active) VALUES
('MUSIC', 'Performing Arts', 'MUSIC performance competition', 100, true),
('DANCE', 'Performing Arts', 'DANCE performance competition', 100, true),
('DRAMATICS & EXPRESSION', 'Performing Arts', 'DRAMATICS & EXPRESSION performance competition', 100, true),
('CREATIVE & DIGITAL', 'Digital Art', 'CREATIVE & DIGITAL competition', 100, true),
('CONTENT CREATION', 'Digital Art', 'CONTENT CREATION competition', 100, true),
('VISUALARTS', 'Fine Arts', 'VISUALARTS competition', 100, true),
('CODING CREATIVITY', 'Tech', 'CODING CREATIVITY competition', 100, true),
('INNOVATION PITCH', 'Entrepreneurship', 'INNOVATION PITCH competition', 100, true),
('TECH SHOWCASE', 'Tech', 'TECH SHOWCASE competition', 100, true),
('ARTISTRY IN MOTION', 'Performing Arts', 'ARTISTRY IN MOTION competition', 100, true),
('IDE-A-THON', 'Innovation', 'IDE-A-THON competition', 100, true),
('TRASH TO TREASURE', 'Eco', 'TRASH TO TREASURE competition', 100, true),
('ORIGAMI', 'Craft', 'ORIGAMI competition', 100, true),
('BEST MANAGER', 'Management', 'BEST MANAGER competition', 100, true),
('SPEED SKETCHING', 'Fine Arts', 'SPEED SKETCHING competition', 100, true),
('MIME', 'Performing Arts', 'MIME performance competition', 100, true),
('COSPLAY', 'Performing Arts', 'COSPLAY competition', 100, true),
('FASHION DESIGNING', 'Fashion', 'FASHION DESIGNING competition', 100, true),
('SPELL BEE', 'Literary', 'SPELL BEE competition', 100, true),
('ROAST & TOAST', 'Literary', 'ROAST & TOAST competition', 100, true),
('ONE-ACT PLAY', 'Performing Arts', 'ONE-ACT PLAY competition', 100, true),
('RECITATION', 'Literary', 'RECITATION competition', 100, true)
ON CONFLICT (title) DO NOTHING;
