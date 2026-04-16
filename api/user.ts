import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const userId = decoded.id;

  if (req.method === 'POST') {
    const { resource, registrationId, round, videoUrl, notes } = req.body;

    if (resource === 'submission') {
      try {
        // Verify registration belongs to user
        const regCheck = await query('SELECT id FROM registrations WHERE id = $1 AND user_id = $2', [registrationId, userId]);
        if (regCheck.rows.length === 0) return res.status(403).json({ error: 'Forbidden' });

        const result = await query(
          'INSERT INTO submissions (id, registration_id, round, video_url, video_path, notes, status) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING *',
          [registrationId, round, videoUrl, videoUrl, notes || null, 'submitted']
        );
        return res.status(200).json(result.rows[0]);
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { resource } = req.query;

    if (resource === 'profile') {
      const result = await query('SELECT id, full_name, email, role, phone, college_name FROM users WHERE id = $1', [userId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json(result.rows[0]);
    }

    if (resource === 'registrations') {
      const result = await query(`
        SELECT 
          r.*, 
          e.title as event_title, 
          e.category as event_category, 
          e.image_url as event_image_url
        FROM registrations r
        JOIN events e ON r.event_id = e.id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
      `, [userId]);
      
      const regs = result.rows;
      for (let reg of regs) {
        const subs = await query('SELECT * FROM submissions WHERE registration_id = $1 ORDER BY created_at DESC', [reg.id]);
        reg.submissions = subs.rows;
      }

      return res.status(200).json(regs);
    }

    return res.status(400).json({ error: 'Invalid resource' });
  } catch (err: any) {
    console.error('User API Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch user data' });
  }
}
