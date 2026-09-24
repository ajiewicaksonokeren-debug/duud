import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server } from 'socket.io';

import { uploadsDir } from './db.js';
import './data/seed.js';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import questionRoutes from './routes/questions.js';
import gameRoutes from './routes/game.js';
import rewardRoutes from './routes/rewards.js';
import rouletteRoutes from './routes/roulette.js';
import publicClaimRoutes from './routes/publicClaims.js';
import uploadRoutes from './routes/uploads.js';
import rushRoutes from './routes/rush.js';
import { registerMultiplayer } from './socket/multiplayer.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/roulette', rouletteRoutes);
app.use('/api/public/claims', publicClaimRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/rush', rushRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

registerMultiplayer(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Tebak Gambar server running on http://localhost:${PORT}`);
});
