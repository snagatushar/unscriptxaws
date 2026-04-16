import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    user_id, event_id, participant_name, email, phone, college_name,
    department, year_of_study, team_name, team_size, sub_category,
    team_members, payment_screenshot_url, id_card_url
  } = req.body;

  try {
    // Basic validation
    if (!user_id || !event_id || !payment_screenshot_url || !id_card_url) {
      return res.status(400).json({ error: 'Missing required AWS registration parameters' });
    }

    // Insert into RDS Postgres
    const sql = `
      INSERT INTO registrations (
        user_id, event_id, participant_name, email, phone, college_name,
        department, year_of_study, team_name, team_size, sub_category,
        team_members, payment_screenshot_url, id_card_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const values = [
      user_id, event_id, participant_name, email, phone, college_name,
      department, year_of_study, team_name, team_size, sub_category,
      JSON.stringify(team_members || []), payment_screenshot_url, id_card_url
    ];

    const result = await query(sql, values);

    // Also update phone/college in users table
    await query(
      `UPDATE users SET phone = $1, college_name = $2, full_name = $3 WHERE id = $4`,
      [phone, college_name, participant_name, user_id]
    );

    return res.status(200).json({ success: true, data: result.rows[0] });

  } catch (err: any) {
    console.error('AWS RDS Insert Error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'You have already registered for this event category.' });
    }
    return res.status(500).json({ error: err.message || 'Database error occurred' });
  }
}
