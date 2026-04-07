-- Fix: Add missing column for ID Card URLs
-- Run this in your Supabase SQL Editor.

ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS id_card_url text;
