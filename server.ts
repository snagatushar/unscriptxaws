import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import uploadHandler from './api/upload';

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Serve API endpoints
  app.post('/api/upload', (req, res) => {
    // uploadHandler is renamed from drive-upload
    uploadHandler(req, res);
  });

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
