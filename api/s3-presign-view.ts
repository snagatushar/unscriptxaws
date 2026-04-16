import { VercelRequest, VercelResponse } from '@vercel/node';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from './_lib/s3-client.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { key } = req.query;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid object key' });
    }

    // Public vs Private filtering
    const isPublic = key.startsWith('events/') || key.startsWith('slideshow/') || key.startsWith('committee/') || key.startsWith('faculty/');
    
    if (!isPublic) {
      // Authentication Check for Private Assets
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'Authentication required for private assets' });
      
      try {
        jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      return res.status(500).json({ error: 'AWS_S3_BUCKET_NAME is not configured' });
    }

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });

    return res.status(200).json({
      viewUrl: presignedUrl,
    });
  } catch (error: any) {
    console.error('S3 presign view error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
