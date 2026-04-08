import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3000;

// Enable CORS for frontend development
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Vercel handlers usually do their own parsing (e.g. formidable for uploads)
app.use(express.json());

// Dynamic route loader for the /api folder
async function loadApiRoutes() {
  const apiFiles = [
    { path: '/api/drive-upload', file: './api/drive-upload.ts' },
    { path: '/api/drive-files', file: './api/drive-files.ts' },
    { path: '/api/drive-list-event', file: './api/drive-list-event.ts' },
    { path: '/api/drive-view', file: './api/drive-view.ts' },
    { path: '/api/auth/google', file: './api/auth/google/index.ts' },
    { path: '/api/auth/google/callback', file: './api/auth/google/callback.ts' },
  ];

  for (const route of apiFiles) {
    try {
      // Import the Vercel handler
      const handlerModule = await import(route.file);
      const handler = handlerModule.default;

      if (typeof handler === 'function') {
        console.log(`Loaded route: ${route.path} -> ${route.file}`);
        
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
      }
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
