import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { eventId, userId } = req.query;

  try {
    if (!eventId) return res.status(400).json({ error: 'Missing eventId' });

    const eventResult = await query(`SELECT * FROM events WHERE id = $1`, [eventId]);
    if (eventResult.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const event = eventResult.rows[0];

    let registeredCategories: string[] = [];

    if (userId) {
      const regResult = await query(
        `SELECT sub_category FROM registrations WHERE user_id = $1 AND event_id = $2`, 
        [userId, eventId]
      );
      registeredCategories = regResult.rows
        .map(r => r.sub_category)
        .filter((v): v is string => v !== null && v !== '');
    }

    return res.status(200).json({ event, registeredCategories });
  } catch (err: any) {
    console.error('Event Load Error:', err);
    return res.status(500).json({ error: err.message || 'Database error occurred' });
  }
}
