import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = 'postgres://postgres:Prutus227055@unscriptx-db.cxkccq4i00c9.ap-south-1.rds.amazonaws.com:5432/postgres';

async function run() {
  const client = new Client({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    console.log('Connected to AWS RDS PostgreSQL!');

    // Create ENUM types since Supabase USER-DEFINED is not standard Postgres export
    const enums = `
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE submission_status AS ENUM ('locked', 'unlocked', 'submitted', 'evaluated');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE review_status AS ENUM ('not_started', 'in_progress', 'completed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE qualification_stage AS ENUM ('not_started', 'qualified', 'disqualified');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE app_role AS ENUM ('user', 'judge', 'payment_reviewer', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await client.query(enums);
    console.log('Custom Enums created.');

    const sqlPath = './backend_setup.sql';
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Remove the foreign key to Supabase's auth.users
    sqlContent = sqlContent.replace(/,\s*CONSTRAINT users_id_fkey FOREIGN KEY \(id\) REFERENCES auth\.users\(id\)/g, '');
    
    // Fix Types
    sqlContent = sqlContent.replace(/\bpayment_status USER-DEFINED/g, 'payment_status payment_status');
    sqlContent = sqlContent.replace(/\bsubmission_status USER-DEFINED/g, 'submission_status submission_status');
    sqlContent = sqlContent.replace(/\breview_status USER-DEFINED/g, 'review_status review_status');
    sqlContent = sqlContent.replace(/\bqualification_stage USER-DEFINED/g, 'qualification_stage qualification_stage');
    sqlContent = sqlContent.replace(/\brole USER-DEFINED/g, 'role app_role');
    sqlContent = sqlContent.replace(/\bround USER-DEFINED/g, 'round text');
    sqlContent = sqlContent.replace(/\bstatus USER-DEFINED/g, 'status submission_status');
    sqlContent = sqlContent.replace(/\brules ARRAY/g, 'rules text[]');
    sqlContent = sqlContent.replace(/\bsub_categories ARRAY/g, 'sub_categories text[]');


    // Add password_hash to users table
    sqlContent += `\nALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;\n`;

    console.log('Executing tables setup...');
    
    // The sql dump has multiple CREATE TABLE statements. We can run them individually or safely.
    // Notice that running raw sql statements without a drop might fail if they already exist, but RDS is fresh.
    const statements = sqlContent.split(';');
    let pending = statements.filter(s => s.trim() !== '');
    let previousCount = -1;

    while (pending.length > 0 && pending.length !== previousCount) {
      previousCount = pending.length;
      let nextPending = [];

      for (const stmt of pending) {
        try {
          await client.query(stmt);
        } catch (e: any) {
             // Ignoring "relation already exists" errors
             if (e.code === '42P07') {
                 // Already exists, we can drop it from pending
             } else {
                 nextPending.push(stmt);
             }
        }
      }
      pending = nextPending;
    }

    if (pending.length > 0) {
       console.log('Some statements failed to execute due to unresolvable errors:');
       for (const stmt of pending) {
           console.log(stmt.substring(0, 50));
       }
    }
    
    console.log('Database Setup Complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

run();
