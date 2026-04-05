import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Running migration...');
  const { error } = await supabase.rpc('exec_sql', {
    sql_query: "ALTER TABLE public.reviewer_event_assignments ADD COLUMN IF NOT EXISTS role_type text DEFAULT 'judge' CHECK (role_type IN ('judge', 'payment'));"
  });

  if (error) {
    if (error.message.includes('function "exec_sql" does not exist')) {
       console.log('No exec_sql RPC found. Trying alternative method via REST / query?');
       // If no RPC, we might need to use another tool or ask user to run it in SQL Editor.
       console.error('CRITICAL: To fix this, please copy-paste the following SQL into your Supabase SQL Editor:');
       console.error("ALTER TABLE public.reviewer_event_assignments ADD COLUMN IF NOT EXISTS role_type text DEFAULT 'judge' CHECK (role_type IN ('judge', 'payment'));");
    } else {
       console.error('Migration failed:', error);
    }
  } else {
    console.log('Migration successful!');
  }
}

run();
