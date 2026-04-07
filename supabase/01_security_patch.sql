-- Security Patch for Supabase
-- Run this in your Supabase SQL Editor to secure your database against unauthorized attribute escalation.

-- 1. Ensure RLS is active on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Drop the existing overly-permissive UPDATE policy if it exists (replace name if different)
-- DROP POLICY IF EXISTS "Users can update own details" ON public.users;

-- 3. Create a strict UPDATE policy that prevents altering the `role` column
CREATE POLICY "Strict User Profile Update" 
ON public.users
FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM public.users WHERE id = auth.uid()) 
);

-- Note: The admin dashboard or service_role key will still bypass RLS and can update roles.
