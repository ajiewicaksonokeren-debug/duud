import bcrypt from 'bcryptjs';
import db from '../db.js';

const packCount = db.prepare('SELECT COUNT(*) AS c FROM packs').get().c;

if (packCount === 0) {
  console.log('Seeding database...');

  const insertPack = db.prepare(
    `INSERT INTO packs (order_index, name, category, unlock_player_level) VALUES (?, ?, ?, ?)`
  );
  const insertQuestion = db.prepare(
    `INSERT INTO questions (pack_id, order_index, clues_json, answer, difficulty, reward_coins, reward_xp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const clue = (type, value) => ({ type, value });

  const packs = [
    {
      name: 'Level 1',
      category: 'Level',
      unlock: 1,
      questions: [
        { clues: [clue('emoji', '🍃'), clue('text', 'B'), clue('emoji', '🐔')], answer: 'BUAH LOKAL' },
        { clues: [clue('emoji', '🔑'), clue('emoji', '🐴')], answer: 'KUNCIR KUDA' },
        { clues: [clue('text', 'KR'), clue('emoji', '🦆'), clue('text', 'TA')], answer: 'KERAMAT' },
        { clues: [clue('text', 'AM'), clue('emoji', '🥬'), clue('emoji', '🥛')], answer: 'AMSUSU' },
      ],
    },
    {
      name: 'Level 2',
      category: 'Level',
      unlock: 1,
      questions: [
        { clues: [clue('emoji', '👑'), clue('text', 'F'), clue('emoji', '🌙')], answer: 'RAJA BULAN' },
        { clues: [clue('text', 'S6'), clue('emoji', '🧠')], answer: 'SIENAM OTAK' },
        { clues: [clue('text', 'K'), clue('emoji', '☁️'), clue('text', 'MAH')], answer: 'KAWANMAH' },
        { clues: [clue('emoji', '👄'), clue('emoji', '🐊')], answer: 'MULUT BUAYA' },
      ],
    },
    {
      name: 'Kode Rahasia',
      category: 'Event',
      unlock: 2,
      questions: [
        { clues: [clue('emoji', '🏋️'), clue('emoji', '🍗'), clue('emoji', '🦴'), clue('emoji', '👽'), clue('emoji', '👖')], answer: 'FITNES AYAM TULANG ALIEN JEANS' },
      ],
    },
    {
      name: 'Kuliner',
      category: 'Event',
      unlock: 2,
      questions: [
        { clues: [clue('emoji', '🥄'), clue('emoji', '🪞'), clue('text', 'NG')], answer: 'SENDOK CERMIN' },
      ],
    },
    {
      name: 'Tebakan Cinta',
      category: 'Event',
      unlock: 3,
      questions: [
        { clues: [clue('emoji', '👊'), clue('emoji', '❤️')], answer: 'PATAH HATI' },
      ],
    },
    {
      name: 'Hari Merdeka',
      category: 'Event',
      unlock: 3,
      questions: [
        { clues: [clue('emoji', '🍚'), clue('emoji', '🍲')], answer: 'NASI TUMPENG' },
      ],
    },
  ];

  packs.forEach((pack, pIdx) => {
    const info = insertPack.run(pIdx, pack.name, pack.category, pack.unlock);
    const packId = info.lastInsertRowid;
    pack.questions.forEach((q, qIdx) => {
      insertQuestion.run(
        packId,
        qIdx,
        JSON.stringify(q.clues),
        q.answer.toUpperCase(),
        1 + (qIdx % 3),
        10 + qIdx * 2,
        10 + qIdx * 2
      );
    });
  });

  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(
      `INSERT INTO users (username, password_hash, is_admin, coins, xp, player_level, avatar) VALUES (?, ?, 1, 500, 0, 1, '🧑‍💻')`
    ).run('admin', hash);
    console.log('Created admin user -> username: admin / password: admin123');
  }

  console.log('Seed complete.');
} else {
  console.log('Database already seeded, skipping.');
}
