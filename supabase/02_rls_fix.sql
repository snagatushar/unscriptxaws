-- Fix for "new row violates row-level security policy" during registration.

-- 1. Allow authenticated users to upload to the "payments" bucket
CREATE POLICY "Enable insert for authenticated users in payments"
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'payments');

-- 2. Ensure users can insert their own registrations
CREATE POLICY "Enable insert for users registrations"
ON public.registrations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. (Optional but recommended) Ensure users can read their own registrations
CREATE POLICY "Enable read for users registrations"
ON public.registrations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
