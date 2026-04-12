-- Run this script in your Supabase SQL Editor

-- 1. Create the contact_messages table
CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' NOT NULL, -- 'unread', 'read', 'archived'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Setup Row Level Security (RLS)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- 3. Allow ANYONE to insert a message (anonymous users can submit contact form)
CREATE POLICY "Enable insert for anyone" ON public.contact_messages
    FOR INSERT 
    WITH CHECK (true);

-- 4. Allow ONLY ADMINS to read or update messages
CREATE POLICY "Enable reading for admins only" ON public.contact_messages
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );

CREATE POLICY "Enable updates for admins only" ON public.contact_messages
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );
    
CREATE POLICY "Enable deletes for admins only" ON public.contact_messages
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'admin'
        )
    );
