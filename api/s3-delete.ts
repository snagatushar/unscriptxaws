import { VercelRequest, VercelResponse } from '@vercel/node';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from './_lib/s3-client.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Missing object key to delete' });
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      return res.status(500).json({ error: 'AWS_S3_BUCKET_NAME is not configured' });
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);

    return res.status(200).json({
      success: true,
      message: 'Object deleted successfully',
    });
  } catch (error: any) {
    console.error('S3 delete error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
