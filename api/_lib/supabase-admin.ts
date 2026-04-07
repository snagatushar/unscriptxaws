import { createClient } from '@supabase/supabase-js';

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!url) {
    throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL).');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function verifyUserToken(req: any) {
  let token = req.headers?.authorization?.replace('Bearer ', '');
  if (!token && req.query?.token) {
    token = req.query.token as string;
  }
  if (!token) throw new Error('Unauthorized');

  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Invalid token');
  
  return user;
}

export async function verifyAdminOrJudge(req: any) {
  const user = await verifyUserToken(req);
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase.from('users').select('role').eq('id', user.id).single();
  
  if (error || (profile?.role !== 'admin' && profile?.role !== 'judge')) {
     throw new Error('Insufficient permissions. Admin or judge role required.');
  }
  return user;
}

export async function verifyAdmin(req: any) {
  const user = await verifyUserToken(req);
  const supabase = getSupabaseAdmin();
  const { data: profile, error } = await supabase.from('users').select('role').eq('id', user.id).single();
  
  if (error || profile?.role !== 'admin') {
     throw new Error('Requires admin role');
  }
  return user;
}
