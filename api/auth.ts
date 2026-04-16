import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, email, password, name } = req.body;

  try {
    if (action === 'signup') {
      const domain = email.split('@')[1]?.toLowerCase();
      if (domain) {
        const blockedRes = await query('SELECT domain FROM blocked_domains WHERE domain = $1', [domain]);
        if (blockedRes.rows.length > 0) return res.status(400).json({ error: 'Temporary or disposable emails are not allowed.' });
      }

      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const insertRes = await query(
        `INSERT INTO users (id, full_name, email, role, password_hash) VALUES (gen_random_uuid(), $1, $2, 'user', $3) RETURNING id, role`,
        [name || email, email, hashedPassword]
      );
      
      const user = insertRes.rows[0];
      const token = jwt.sign({ id: user.id, email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      
      return res.status(200).json({ success: true, token, user });
    }

    if (action === 'login') {
      const result = await query('SELECT id, email, role, password_hash FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

      const user = result.rows[0];
      const isValid = await bcrypt.compare(password, user.password_hash || '');
      if (!isValid) return res.status(400).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      
      return res.status(200).json({ 
        success: true, 
        token, 
        user: { id: user.id, email: user.email, role: user.role } 
      });
    }

    if (action === 'reset-password') {
      // Placeholder for AWS SES email sending
      // In a real scenario, we would generate a token, save it to DB, and send an email.
      // For now, we simulate success to allow the UI to transition.
      return res.status(200).json({ success: true, message: 'Password reset link sent (simulated)' });
    }

    if (action === 'update-password') {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const hashedUpdate = await bcrypt.hash(password, 10);
        await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedUpdate, decoded.id]);
        return res.status(200).json({ success: true });
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    }

    if (action === 'me') {
      const { token } = req.body;
      if (!token) return res.status(401).json({ error: 'No token provided' });
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        // Verify user still exists in DB
        const result = await query('SELECT id, email, role, full_name, phone, college_name FROM users WHERE id = $1', [decoded.id]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'User no longer exists' });
        
        const user = result.rows[0];
        return res.status(200).json({ 
          success: true, 
          user: { 
            id: user.id, 
            email: user.email, 
            role: user.role, 
            full_name: user.full_name, 
            phone: user.phone, 
            college_name: user.college_name 
          } 
        });
      } catch (err: any) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err: any) {
    console.error('AWS Auth Error:', err);
    return res.status(500).json({ error: err.message || 'Authentication failed' });
  }
}
