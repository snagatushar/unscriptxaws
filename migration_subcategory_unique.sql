-- Migration: Allow multiple subcategory registrations per event per user
-- Run this in your Supabase SQL Editor

-- Step 1: Drop the existing unique constraint on (user_id, event_id)
-- Try common constraint names — only one will exist
ALTER TABLE public.registrations
  DROP CONSTRAINT IF EXISTS registrations_user_id_event_id_key;
ALTER TABLE public.registrations
  DROP CONSTRAINT IF EXISTS registrations_user_id_event_id_unique;

-- Also drop if it was created as an index
DROP INDEX IF EXISTS registrations_user_id_event_id_key;
DROP INDEX IF EXISTS registrations_user_id_event_id_unique;

-- Step 2: Add new unique index that includes sub_category
-- COALESCE handles NULL sub_category (events without subcategories still get 1 registration max)
CREATE UNIQUE INDEX registrations_user_event_subcategory_unique
  ON public.registrations (user_id, event_id, COALESCE(sub_category, ''));
