import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server } from 'socket.io';

import './data/seed.js';
import authRoutes from './routes/auth.js';
import packRoutes from './routes/packs.js';
import questionRoutes from './routes/questions.js';
import gameRoutes from './routes/game.js';
import rewardRoutes from './routes/rewards.js';
import { registerMultiplayer } from './socket/multiplayer.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/rewards', rewardRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

registerMultiplayer(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Tebak Gambar server running on http://localhost:${PORT}`);
});
