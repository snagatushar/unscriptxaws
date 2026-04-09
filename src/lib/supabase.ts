import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.PROD) {
    throw new Error('Supabase URL or Anon Key is missing. Check your environment variables.');
  } else {
    console.warn('Supabase URL or Anon Key is missing. Make sure to add them to your .env file.');
  }
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
