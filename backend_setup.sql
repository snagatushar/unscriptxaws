-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  actor_id uuid,
  action_type text NOT NULL,
  target_id text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id)
);
CREATE TABLE public.blocked_domains (
  domain text NOT NULL,
  CONSTRAINT blocked_domains_pkey PRIMARY KEY (domain)
);
CREATE TABLE public.committee (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT committee_pkey PRIMARY KEY (id)
);
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'unread'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE,
  category text NOT NULL,
  description text NOT NULL,
  rules ARRAY NOT NULL DEFAULT '{}'::text[],
  image_url text,
  entry_fee numeric NOT NULL DEFAULT 0,
  max_team_size integer NOT NULL DEFAULT 1,
  payment_account_name text,
  payment_account_number text,
  payment_ifsc text,
  payment_upi_id text,
  drive_folder_id text,
  drive_embed_hint text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  sub_categories ARRAY DEFAULT '{}'::text[],
  requires_team_details boolean DEFAULT false,
  CONSTRAINT events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.faculty (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  designation text NOT NULL,
  image_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT faculty_pkey PRIMARY KEY (id)
);
CREATE TABLE public.general_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  rule_text text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT general_rules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.google_oauth_tokens (
  id text NOT NULL,
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expiry_date bigint,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT google_oauth_tokens_pkey PRIMARY KEY (id)
);
CREATE TABLE public.hero_slideshow (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 2,
  CONSTRAINT hero_slideshow_pkey PRIMARY KEY (id)
);
CREATE TABLE public.internal_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL UNIQUE,
  score numeric DEFAULT 0,
  judge_remarks text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT internal_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT internal_reviews_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id)
);
CREATE TABLE public.registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  participant_name text,
  email text,
  phone text NOT NULL,
  college_name text,
  department text,
  year_of_study text,
  team_name text,
  team_size integer,
  team_members jsonb NOT NULL DEFAULT '[]'::jsonb,
  payment_screenshot_url text NOT NULL,
  payment_notes text,
  payment_status USER-DEFINED NOT NULL DEFAULT 'pending'::payment_status,
  payment_review_notes text,
  payment_reviewed_by uuid,
  payment_reviewed_at timestamp with time zone,
  upload_enabled boolean NOT NULL DEFAULT false,
  upload_enabled_by uuid,
  upload_enabled_at timestamp with time zone,
  submission_status USER-DEFINED NOT NULL DEFAULT 'locked'::submission_status,
  drive_file_id text,
  drive_view_url text,
  drive_download_url text,
  submission_notes text,
  submitted_at timestamp with time zone,
  review_status USER-DEFINED NOT NULL DEFAULT 'not_started'::review_status,
  review_notes text,
  content_reviewed_by uuid,
  content_reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  qualification_stage USER-DEFINED NOT NULL DEFAULT 'not_started'::qualification_stage,
  qualification_notes text,
  id_card_url text,
  sub_category text,
  CONSTRAINT registrations_pkey PRIMARY KEY (id),
  CONSTRAINT registrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT registrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT registrations_payment_reviewed_by_fkey FOREIGN KEY (payment_reviewed_by) REFERENCES public.users(id),
  CONSTRAINT registrations_upload_enabled_by_fkey FOREIGN KEY (upload_enabled_by) REFERENCES public.users(id),
  CONSTRAINT registrations_content_reviewed_by_fkey FOREIGN KEY (content_reviewed_by) REFERENCES public.users(id)
);
CREATE TABLE public.reviewer_event_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL,
  event_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  role_type text DEFAULT 'judge'::text CHECK (role_type = ANY (ARRAY['judge'::text, 'payment'::text])),
  CONSTRAINT reviewer_event_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT reviewer_event_assignments_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.users(id),
  CONSTRAINT reviewer_event_assignments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.site_content (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content_key text NOT NULL UNIQUE,
  title text,
  subtitle text,
  body text,
  secondary_body text,
  image_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT site_content_pkey PRIMARY KEY (id)
);
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL,
  round USER-DEFINED NOT NULL,
  video_url text NOT NULL,
  video_path text NOT NULL,
  notes text,
  status USER-DEFINED NOT NULL DEFAULT 'submitted'::submission_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.registrations(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  full_name text,
  email text NOT NULL UNIQUE,
  phone text,
  college_name text,
  role USER-DEFINED NOT NULL DEFAULT 'user'::app_role,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);