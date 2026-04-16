import { VercelRequest, VercelResponse } from '@vercel/node';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from './_lib/s3-client.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication Check
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authentication required' });
  
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  try {
    const { fileName, fileType, folder } = req.body;
    
    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      return res.status(500).json({ error: 'AWS_S3_BUCKET_NAME is not configured' });
    }

    // Path Validation & Sanitization
    const validFolders = ['events', 'slideshow', 'committee', 'faculty', 'evidence', 'temp'];
    if (folder && !validFolders.includes(folder)) {
        return res.status(400).json({ error: 'Invalid upload folder' });
    }

    // MIME Allow-List
    const ALLOWED_MIME_TYPES = [
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/pdf'
    ];
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
      return res.status(400).json({ error: 'Unsupported file type. Only images, videos, and PDFs are allowed.' });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const folderPath = folder ? `${folder}/` : 'general/';
    const key = `${folderPath}${Date.now()}_${safeName}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    const region = process.env.AWS_REGION || 'ap-south-1';
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return res.status(200).json({
      uploadUrl: presignedUrl,
      key: key,
      publicUrl: publicUrl,
    });
  } catch (error: any) {
    console.error('S3 presign error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
