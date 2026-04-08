import { getDriveClientWithOAuth } from './_lib/google-oauth.js';
import { getSupabaseAdmin, verifyUserToken } from './_lib/supabase-admin.js';

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await verifyUserToken(req);
    const userId = user.id;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('registrations')
      .select('event_id, submissions(video_path, created_at)')
      .eq('user_id', userId);

    if (error) throw error;

    const fileIds = (data || [])
      .flatMap((row: any) => row.submissions || [])
      .map((submission: any) => submission.video_path)
      .filter(Boolean);

    if (fileIds.length === 0) return res.status(200).json({ files: [] });

    const drive = await getDriveClientWithOAuth();
    const files = await Promise.all(
      fileIds.map(async (fileId: string) => {
        const metadata = await drive.files.get({
          fileId,
          fields: 'id,name,mimeType,size,createdTime',
        });
        return metadata.data;
      })
    );

    return res.status(200).json({ files });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Failed to list files' });
  }
}
