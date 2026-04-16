import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import { resolve } from 'path';

// ... rest of the imports ...

const app = express();
const PORT = process.env.BACKEND_PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.error('\n❌ ERROR: DATABASE_URL is missing from environment variables!');
  console.error('   Please check your .env or .env.local file.\n');
}

// Enable CORS for frontend development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Upload-Url', 'X-Content-Range', 'X-Content-Type']
}));

// Parse raw binary bodies (for chunk uploads) before JSON
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));
// Vercel handlers usually do their own parsing (e.g. formidable for uploads)
app.use(express.json());

// Dynamic route loader for the /api folder
async function loadApiRoutes() {
  const apiFiles = [
    { path: '/api/drive-upload', file: './api/drive-upload.ts' },
    { path: '/api/drive-init-upload', file: './api/drive-init-upload.ts' },
    { path: '/api/drive-upload-chunk', file: './api/drive-upload-chunk.ts' },
    { path: '/api/drive-files', file: './api/drive-files.ts' },
    { path: '/api/drive-list-event', file: './api/drive-list-event.ts' },
    { path: '/api/drive-view', file: './api/drive-view.ts' },
    { path: '/api/s3-presign', file: './api/s3-presign.ts' },
    { path: '/api/s3-presign-view', file: './api/s3-presign-view.ts' },
    { path: '/api/s3-delete', file: './api/s3-delete.ts' },
    { path: '/api/auth', file: './api/auth.ts' },
    { path: '/api/public', file: './api/public.ts' },
    { path: '/api/user', file: './api/user.ts' },
    { path: '/api/admin', file: './api/admin.ts' },
    { path: '/api/contact', file: './api/contact.ts' },
    { path: '/api/register-event', file: './api/register-event.ts' },
    { path: '/api/event-registration-data', file: './api/event-registration-data.ts' },
    { path: '/api/auth/google', file: './api/auth/google/index.ts' },
    { path: '/api/auth/google/callback', file: './api/auth/google/callback.ts' },
  ];

  for (const route of apiFiles) {
    try {
      // Import the Vercel handler
      console.log(`⏳ Loading route: ${route.path}...`);
      const handlerModule = await import(route.file);
      console.log(`✅ Loaded module: ${route.file}`);
      const handler = handlerModule.default;
        
        // Register the route with express
        // Note: Vercel functions handle both GET/POST/etc in one handler
        app.all(route.path, (req, res) => {
          // Wrap the handler to support async
          Promise.resolve(handler(req, res))
            .catch(err => {
              console.error(`Error in handler ${route.path}:`, err);
              res.status(500).json({ error: err.message || 'Internal Server Error' });
            });
        });
    } catch (err) {
      console.error(`Failed to load route ${route.path} from ${route.file}:`, err);
    }
  }
}

async function start() {
  await loadApiRoutes();

  const server = createServer(app);
  server.listen(PORT, () => {
    console.log(`\n🚀 API Backend running on http://localhost:${PORT}`);
    console.log(`   Vite Frontend running on http://localhost:5173`);
    console.log(`   (Make sure to run 'npm run dev' separately or use concurrently)\n`);
  });
}

start();
