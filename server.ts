import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();

  // SECURITY FIX: Restrict CORS to known origins only
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://unscriptx.vercel.app',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  app.use(express.json({ limit: '1mb' }));

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa', 
  });

  app.use(vite.middlewares);

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running at http://localhost:3000');
  });
}

startServer();
