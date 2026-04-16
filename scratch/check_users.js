import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
  try {
    const res = await pool.query('SELECT email, role FROM users LIMIT 10');
    console.log('--- DATABASE USERS ---');
    console.log(JSON.stringify(res.rows, null, 2));
    console.log('----------------------');
    process.exit(0);
  } catch (err) {
    console.error('Database Error:', err.message);
    process.exit(1);
  }
}

checkUsers();
