import jwt from 'jsonwebtoken';
import db from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';

const ROUND_DURATION_MS = 30000;
const ROUND_END_PAUSE_MS = 3500;
const ROUNDS_PER_MATCH = 5;

/** @type {Map<string, Room>} */
const rooms = new Map();

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function pickQuestions(packId, count) {
  const pool = packId
    ? db.prepare('SELECT * FROM questions WHERE pack_id = ?').all(packId)
    : db.prepare('SELECT * FROM questions').all();
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function publicRoomState(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    packId: room.packId,
    totalRounds: room.questions.length,
    currentRound: room.currentIndex + 1,
    players: [...room.players.values()].map((p) => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      answered: p.answeredCorrectly,
      connected: p.connected,
    })),
  };
}

function currentQuestionPublic(room) {
  const q = room.questions[room.currentIndex];
  if (!q) return null;
  return {
    index: room.currentIndex,
    total: room.questions.length,
    clues: JSON.parse(q.clues_json),
    answerLength: q.answer.replace(/\s/g, '').length,
    durationMs: ROUND_DURATION_MS,
    startedAt: room.roundStartedAt,
  };
}

function broadcastRoom(io, room) {
  io.to(room.code).emit('room:update', publicRoomState(room));
}

function clearRoomTimer(room) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
}

function endMatch(io, room) {
  room.status = 'finished';
  clearRoomTimer(room);
  const players = [...room.players.values()].sort((a, b) => b.score - a.score);
  const winner = players[0];

  const applyRewards = db.transaction(() => {
    players.forEach((p, idx) => {
      const coins = idx === 0 ? 100 : Math.max(10, 40 - idx * 10);
      const xp = idx === 0 ? 60 : Math.max(5, 25 - idx * 5);
      db.prepare('UPDATE users SET coins = coins + ?, xp = xp + ? WHERE id = ?').run(coins, xp, p.userId);
      p.coinsAwarded = coins;
      p.xpAwarded = xp;
    });
    db.prepare('INSERT INTO match_history (room_code, players_json, winner_username) VALUES (?, ?, ?)').run(
      room.code,
      JSON.stringify(players.map((p) => ({ username: p.username, score: p.score }))),
      winner?.username || null
    );
  });
  applyRewards();

  io.to(room.code).emit('room:game_over', {
    results: players.map((p) => ({
      userId: p.userId,
      username: p.username,
      avatar: p.avatar,
      score: p.score,
      coinsAwarded: p.coinsAwarded,
      xpAwarded: p.xpAwarded,
    })),
    winner: winner ? { username: winner.username, score: winner.score } : null,
  });

  setTimeout(() => rooms.delete(room.code), 60_000);
}

function nextRound(io, room) {
  clearRoomTimer(room);
  room.currentIndex += 1;

  if (room.currentIndex >= room.questions.length) {
    endMatch(io, room);
    return;
  }

  for (const p of room.players.values()) p.answeredCorrectly = false;
  room.roundStartedAt = Date.now();
  room.firstCorrectAt = null;

  io.to(room.code).emit('room:question', currentQuestionPublic(room));
  broadcastRoom(io, room);

  room.timer = setTimeout(() => finishRound(io, room), ROUND_DURATION_MS);
}

function finishRound(io, room) {
  clearRoomTimer(room);
  const q = room.questions[room.currentIndex];
  io.to(room.code).emit('room:round_end', {
    answer: q.answer,
    players: [...room.players.values()].map((p) => ({ userId: p.userId, username: p.username, score: p.score })),
  });
  room.timer = setTimeout(() => nextRound(io, room), ROUND_END_PAUSE_MS);
}

function startMatch(io, room) {
  room.status = 'playing';
  room.currentIndex = -1;
  room.questions = pickQuestions(room.packId, ROUNDS_PER_MATCH);
  if (room.questions.length === 0) {
    io.to(room.code).emit('room:error', { message: 'Tidak ada soal tersedia untuk pack ini.' });
    room.status = 'waiting';
    return;
  }
  for (const p of room.players.values()) p.score = 0;
  nextRound(io, room);
}

export function registerMultiplayer(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const payload = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    socket.on('room:create', ({ packId } = {}, ack) => {
      const code = makeRoomCode();
      const room = {
        code,
        hostId: user.id,
        status: 'waiting',
        packId: packId || null,
        questions: [],
        currentIndex: -1,
        players: new Map(),
        timer: null,
        roundStartedAt: null,
      };
      room.players.set(user.id, {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        socketId: socket.id,
        score: 0,
        answeredCorrectly: false,
        connected: true,
      });
      rooms.set(code, room);
      socket.join(code);
      socket.data.roomCode = code;
      ack?.({ ok: true, room: publicRoomState(room) });
    });

    socket.on('room:join', ({ code } = {}, ack) => {
      const room = rooms.get((code || '').toUpperCase());
      if (!room) return ack?.({ ok: false, error: 'Room tidak ditemukan.' });
      if (room.status !== 'waiting') return ack?.({ ok: false, error: 'Permainan sudah dimulai.' });

      room.players.set(user.id, {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        socketId: socket.id,
        score: 0,
        answeredCorrectly: false,
        connected: true,
      });
      socket.join(room.code);
      socket.data.roomCode = room.code;
      ack?.({ ok: true, room: publicRoomState(room) });
      broadcastRoom(io, room);
    });

    socket.on('room:start', (_payload, ack) => {
      const room = rooms.get(socket.data.roomCode);
      if (!room) return ack?.({ ok: false, error: 'Room tidak ditemukan.' });
      if (room.hostId !== user.id) return ack?.({ ok: false, error: 'Hanya host yang bisa memulai.' });
      if (room.players.size < 1) return ack?.({ ok: false, error: 'Butuh minimal 1 pemain.' });
      ack?.({ ok: true });
      startMatch(io, room);
    });

    socket.on('room:answer', ({ answer } = {}, ack) => {
      const room = rooms.get(socket.data.roomCode);
      if (!room || room.status !== 'playing') return ack?.({ ok: false });
      const player = room.players.get(user.id);
      const q = room.questions[room.currentIndex];
      if (!player || !q || player.answeredCorrectly) return ack?.({ ok: false });

      const normalize = (s) =>
        String(s || '')
          .toUpperCase()
          .normalize('NFKD')
          .replace(/[^A-Z0-9]+/g, ' ')
          .trim();

      const correct = normalize(answer) === normalize(q.answer);
      if (!correct) {
        ack?.({ ok: true, correct: false });
        return;
      }

      player.answeredCorrectly = true;
      const elapsedSec = (Date.now() - room.roundStartedAt) / 1000;
      const isFirst = room.firstCorrectAt === null;
      if (isFirst) room.firstCorrectAt = Date.now();
      const points = isFirst ? Math.max(40, Math.round(100 - elapsedSec * 2)) : 30;
      player.score += points;

      ack?.({ ok: true, correct: true, points });
      io.to(room.code).emit('room:player_answered', {
        userId: user.id,
        username: user.username,
        points,
        first: isFirst,
      });
      broadcastRoom(io, room);

      const allAnswered = [...room.players.values()].every((p) => p.answeredCorrectly);
      if (allAnswered) finishRound(io, room);
    });

    socket.on('room:leave', () => leaveRoom(socket));
    socket.on('disconnect', () => leaveRoom(socket));

    function leaveRoom(sock) {
      const room = rooms.get(sock.data.roomCode);
      if (!room) return;
      const player = room.players.get(user.id);
      if (player) player.connected = false;
      sock.leave(room.code);

      const stillConnected = [...room.players.values()].some((p) => p.connected);
      if (!stillConnected) {
        clearRoomTimer(room);
        rooms.delete(room.code);
        return;
      }

      if (room.hostId === user.id) {
        const nextHost = [...room.players.values()].find((p) => p.connected);
        if (nextHost) room.hostId = nextHost.userId;
      }
      broadcastRoom(io, room);
    }
  });
}
