-- Create Enum Types
CREATE TYPE user_role AS ENUM ('admin', 'coordinator', 'reviewer', 'user');
CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected');

-- USERS TABLE
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to automatically create users entry upon signing up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- EVENTS TABLE
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  base_prize INTEGER DEFAULT 0,
  per_participant_bonus INTEGER DEFAULT 0,
  image_url TEXT,
  rules TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- REGISTRATIONS TABLE
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  phone TEXT NOT NULL,
  team_name TEXT,
  payment_status payment_status DEFAULT 'pending'::payment_status NOT NULL,
  payment_screenshot_url TEXT NOT NULL,
  is_selected BOOLEAN DEFAULT false,
  is_eliminated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, event_id)
);

-- UPLOADS TABLE
CREATE TABLE public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  video_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- FACULTY TABLE
CREATE TABLE public.faculty (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

------------------------------------------------------------------------------------
-- SECURITY & POLICIES (ROW LEVEL SECURITY)
------------------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;

-- 1. Events are public to read, but only admins can edit
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Events writable by admins" ON public.events FOR ALL USING (
  EXISTS(SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- 2. Faculty is public to read, but only admins can edit
CREATE POLICY "Faculty is viewable by everyone" ON public.faculty FOR SELECT USING (true);
CREATE POLICY "Faculty writable by admins" ON public.faculty FOR ALL USING (
  EXISTS(SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

-- 3. Users can read their own data, Admins/Coordinators/Reviewers can see all users
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins/Reviewers can read all users" ON public.users FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'coordinator', 'reviewer'))
);
CREATE POLICY "Only admins can edit user roles" ON public.users FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- 4. Registrations: Users can CRUD their own, Admins/Coordinators/Reviewers can read/update all
CREATE POLICY "Users insert own registrations" ON public.registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users view own registrations" ON public.registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff read/update all registrations" ON public.registrations FOR SELECT USING (
  EXISTS(SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'coordinator', 'reviewer'))
);
CREATE POLICY "Staff update all registrations" ON public.registrations FOR UPDATE USING (
  EXISTS(SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'coordinator', 'reviewer'))
);

-- 5. Uploads: Users insert own (if payment approved - enforced in frontend), everyone can read? (Let's say staff only)
CREATE POLICY "Users insert own uploads" ON public.uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own uploads" ON public.uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Staff read all uploads" ON public.uploads FOR ALL USING (
  EXISTS(SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'coordinator', 'reviewer'))
);

------------------------------------------------------------------------------------
-- STORAGE BUCKETS (Need to execute these manually or via SQL Editor)
------------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public) VALUES 
('payments', 'payments', true),
('assets', 'assets', true),
('music', 'music', true),
('dance', 'dance', true),
('dramatics', 'dramatics', true),
('creative_digital', 'creative_digital', true),
('content_creation', 'content_creation', true),
('visual_arts', 'visual_arts', true),
('coding_creativity', 'coding_creativity', true),
('innovation_pitch', 'innovation_pitch', true),
('tech_showcase', 'tech_showcase', true),
('artistry_motion', 'artistry_motion', true),
('ideathon', 'ideathon', true),
('trash_to_treasure', 'trash_to_treasure', true),
('origami', 'origami', true),
('best_manager', 'best_manager', true),
('speed_sketching', 'speed_sketching', true),
('mime', 'mime', true),
('cosplay', 'cosplay', true),
('fashion_designing', 'fashion_designing', true),
('spell_bee', 'spell_bee', true),
('roast_toast', 'roast_toast', true),
('one_act_play', 'one_act_play', true),
('recitation', 'recitation', true);

-- Storage Permissions
CREATE POLICY "Allow authenticated read/write/upload" ON storage.objects
FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT USING (true);

-- COMMITTEE TABLE
CREATE TABLE public.committee (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.committee ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Committee members are viewable by everyone" ON public.committee FOR SELECT USING (true);
CREATE POLICY "Committee members writable by admins" ON public.committee FOR ALL USING (
  EXISTS(SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);

INSERT INTO storage.buckets (id, name, public) VALUES ('committee', 'committee', true);

-- GENERAL RULES TABLE
CREATE TABLE public.general_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.general_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "General rules are viewable by everyone" ON public.general_rules FOR SELECT USING (true);
CREATE POLICY "General rules writable by admins" ON public.general_rules FOR ALL USING (
  EXISTS(SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);


-- Create General Rules table
CREATE TABLE public.general_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable Security
ALTER TABLE public.general_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "General rules are viewable by everyone" ON public.general_rules FOR SELECT USING (true);
CREATE POLICY "General rules writable by admins" ON public.general_rules FOR ALL USING (
  EXISTS(SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);
