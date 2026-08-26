import bcrypt from 'bcryptjs';
import db from '../db.js';

const categoryCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;

const clue = (type, value) => ({ type, value });

if (categoryCount === 0) {
  console.log('Seeding database...');

  const insertCategory = db.prepare(
    `INSERT INTO categories (order_index, name, icon, description, unlock_player_level) VALUES (?, ?, ?, ?, ?)`
  );
  const insertQuestion = db.prepare(
    `INSERT INTO questions (category_id, level_number, clues_json, answer, difficulty, reward_coins, reward_xp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const categories = [
    {
      name: 'Mobile Legends',
      icon: '🎮',
      description: 'Tebak istilah & role di Mobile Legends: Bang Bang',
      unlock: 1,
      questions: [
        { clues: [clue('emoji', '🥷')], answer: 'ASSASSIN' },
        { clues: [clue('emoji', '❤️‍🩹'), clue('emoji', '🛡️')], answer: 'SUPPORT' },
        { clues: [clue('emoji', '🏹')], answer: 'MARKSMAN' },
        { clues: [clue('emoji', '🌳'), clue('emoji', '👹')], answer: 'JUNGLER' },
        { clues: [clue('emoji', '🏆'), clue('emoji', '👑')], answer: 'MYTHIC' },
      ],
    },
    {
      name: 'PUBG Mobile',
      icon: '🔫',
      description: 'Tebak istilah battle royale ala PUBG Mobile',
      unlock: 1,
      questions: [
        { clues: [clue('emoji', '🪂')], answer: 'DROP' },
        { clues: [clue('emoji', '💊'), clue('emoji', '🩹')], answer: 'MEDKIT' },
        { clues: [clue('emoji', '🌀'), clue('emoji', '⚡')], answer: 'ZONA' },
        { clues: [clue('emoji', '🐔'), clue('emoji', '🍽️')], answer: 'CHICKEN DINNER' },
        { clues: [clue('emoji', '🎒')], answer: 'LOOT' },
      ],
    },
    {
      name: 'Free Fire',
      icon: '🔥',
      description: 'Tebak istilah seru dari game Free Fire',
      unlock: 1,
      questions: [
        { clues: [clue('emoji', '💎')], answer: 'DIAMOND' },
        { clues: [clue('emoji', '🐾')], answer: 'PET' },
        { clues: [clue('emoji', '🎁'), clue('emoji', '🛩️')], answer: 'AIRDROP' },
        { clues: [clue('emoji', '🏆'), clue('emoji', '🔥')], answer: 'BOOYAH' },
        { clues: [clue('emoji', '🧟')], answer: 'ZOMBIE' },
      ],
    },
    {
      name: 'Valorant',
      icon: '🎯',
      description: 'Tebak istilah tactical shooter Valorant',
      unlock: 1,
      questions: [
        { clues: [clue('emoji', '💣')], answer: 'SPIKE' },
        { clues: [clue('emoji', '🛡️'), clue('emoji', '👁️')], answer: 'SENTINEL' },
        { clues: [clue('emoji', '💨'), clue('emoji', '⚔️')], answer: 'DUELIST' },
        { clues: [clue('emoji', '🎯'), clue('emoji', '5️⃣')], answer: 'ACE' },
        { clues: [clue('emoji', '🧪'), clue('emoji', '🚪')], answer: 'INITIATOR' },
      ],
    },
    {
      name: 'Dota 2',
      icon: '⚔️',
      description: 'Tebak istilah MOBA klasik Dota 2',
      unlock: 2,
      questions: [
        { clues: [clue('emoji', '🏰')], answer: 'ANCIENT' },
        { clues: [clue('emoji', '💰')], answer: 'GOLD' },
        { clues: [clue('emoji', '↔️')], answer: 'LANE' },
        { clues: [clue('emoji', '👑'), clue('emoji', '💀')], answer: 'ROSHAN' },
        { clues: [clue('emoji', '🎒')], answer: 'ITEM' },
      ],
    },
    {
      name: 'Counter-Strike',
      icon: '💣',
      description: 'Tebak istilah tactical FPS Counter-Strike',
      unlock: 2,
      questions: [
        { clues: [clue('emoji', '💣')], answer: 'BOMB' },
        { clues: [clue('emoji', '🚩')], answer: 'PLANT' },
        { clues: [clue('emoji', '🕵️'), clue('emoji', '🏆')], answer: 'CLUTCH' },
        { clues: [clue('emoji', '🎯'), clue('emoji', '💯')], answer: 'ACE' },
        { clues: [clue('emoji', '💰'), clue('emoji', '📉')], answer: 'ECO' },
      ],
    },
    {
      name: 'League of Legends',
      icon: '🐉',
      description: 'Tebak istilah MOBA populer League of Legends',
      unlock: 2,
      questions: [
        { clues: [clue('emoji', '🐉')], answer: 'DRAGON' },
        { clues: [clue('emoji', '🗼')], answer: 'TOWER' },
        { clues: [clue('emoji', '🧙')], answer: 'MAGE' },
        { clues: [clue('emoji', '🌊'), clue('emoji', '🐙')], answer: 'BARON' },
        { clues: [clue('emoji', '⚔️'), clue('emoji', '🤝')], answer: 'TEAMFIGHT' },
      ],
    },
    {
      name: 'Atlet Esports',
      icon: '🏆',
      description: 'Tebak istilah seputar pemain profesional esports',
      unlock: 1,
      questions: [
        { clues: [clue('emoji', '🕹️'), clue('emoji', '🏆')], answer: 'PRO PLAYER' },
        { clues: [clue('emoji', '🎓')], answer: 'ROOKIE' },
        { clues: [clue('emoji', '👑')], answer: 'MVP' },
        { clues: [clue('emoji', '👥'), clue('emoji', '📋')], answer: 'ROSTER' },
        { clues: [clue('emoji', '🔄')], answer: 'SUBSTITUTE' },
      ],
    },
    {
      name: 'Tim & Organisasi',
      icon: '🛡️',
      description: 'Tebak istilah seputar tim & organisasi esports',
      unlock: 1,
      questions: [
        { clues: [clue('emoji', '🛡️'), clue('emoji', '👥')], answer: 'TEAM' },
        { clues: [clue('emoji', '🏢')], answer: 'ORGANIZATION' },
        { clues: [clue('emoji', '🤝'), clue('emoji', '💰')], answer: 'SPONSOR' },
        { clues: [clue('emoji', '👔')], answer: 'MANAGER' },
        { clues: [clue('emoji', '🎙️')], answer: 'CASTER' },
      ],
    },
    {
      name: 'Turnamen & Event',
      icon: '🏟️',
      description: 'Tebak istilah seputar turnamen & event esports',
      unlock: 2,
      questions: [
        { clues: [clue('emoji', '🏟️')], answer: 'ARENA' },
        { clues: [clue('emoji', '🥇'), clue('emoji', '🏆')], answer: 'CHAMPION' },
        { clues: [clue('emoji', '📅'), clue('emoji', '⚔️')], answer: 'TOURNAMENT' },
        { clues: [clue('emoji', '🎟️')], answer: 'TICKET' },
        { clues: [clue('emoji', '🌍'), clue('emoji', '🏆')], answer: 'WORLD CHAMPIONSHIP' },
      ],
    },
    {
      name: 'Sejarah Esports',
      icon: '📜',
      description: 'Tebak pengetahuan umum & sejarah dunia esports',
      unlock: 3,
      questions: [
        { clues: [clue('emoji', '🕹️'), clue('emoji', '👴')], answer: 'RETRO GAME' },
        { clues: [clue('emoji', '🏛️')], answer: 'FEDERATION' },
        { clues: [clue('emoji', '🥊'), clue('emoji', '💻')], answer: 'ESPORTS' },
        { clues: [clue('emoji', '🏭'), clue('emoji', '💻')], answer: 'INDUSTRY' },
        { clues: [clue('emoji', '🎮'), clue('emoji', '📖')], answer: 'HISTORY' },
      ],
    },
    {
      name: 'Istilah Gaming',
      icon: '🕹️',
      description: 'Tebak istilah gaming sehari-hari yang wajib kamu tahu',
      unlock: 1,
      questions: [
        { clues: [clue('emoji', '🐣')], answer: 'NOOB' },
        { clues: [clue('emoji', '🔄'), clue('emoji', '💀')], answer: 'RESPAWN' },
        { clues: [clue('emoji', '📶'), clue('emoji', '🐢')], answer: 'LAG' },
        { clues: [clue('emoji', '⬆️'), clue('emoji', '💪')], answer: 'BUFF' },
        { clues: [clue('emoji', '⬇️'), clue('emoji', '📉')], answer: 'NERF' },
      ],
    },
  ];

  categories.forEach((cat, cIdx) => {
    const info = insertCategory.run(cIdx, cat.name, cat.icon, cat.description, cat.unlock);
    const categoryId = info.lastInsertRowid;
    cat.questions.forEach((q, qIdx) => {
      insertQuestion.run(
        categoryId,
        qIdx + 1,
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
      `INSERT INTO users (username, password_hash, is_admin, coins, xp, player_level, roulette_tickets, avatar)
       VALUES (?, ?, 1, 500, 0, 1, 5, '🧑‍💻')`
    ).run('admin', hash);
    console.log('Created admin user -> username: admin / password: admin123');
  }

  console.log('Seed complete.');
} else {
  console.log('Database already seeded, skipping.');
}

const prizeCount = db.prepare('SELECT COUNT(*) AS c FROM roulette_prizes').get().c;
if (prizeCount === 0) {
  console.log('Seeding roulette prizes...');
  const insertPrize = db.prepare(
    `INSERT INTO roulette_prizes (name, icon, type, amount, weight, requires_claim, active) VALUES (?, ?, ?, ?, ?, ?, 1)`
  );
  const prizes = [
    { name: '20 Koin', icon: '🪙', type: 'coin', amount: 20, weight: 30, claim: 0 },
    { name: '50 Koin', icon: '🪙', type: 'coin', amount: 50, weight: 20, claim: 0 },
    { name: '100 Koin', icon: '🪙', type: 'coin', amount: 100, weight: 10, claim: 0 },
    { name: '10 Diamond', icon: '💎', type: 'diamond', amount: 10, weight: 12, claim: 1 },
    { name: '50 Diamond', icon: '💎', type: 'diamond', amount: 50, weight: 5, claim: 1 },
    { name: '100 Diamond', icon: '💎', type: 'diamond', amount: 100, weight: 2, claim: 1 },
    { name: 'Voucher Turnamen', icon: '🎟️', type: 'voucher', amount: 1, weight: 3, claim: 1 },
    { name: 'Coba Lagi', icon: '😅', type: 'none', amount: 0, weight: 18, claim: 0 },
  ];
  prizes.forEach((p) => insertPrize.run(p.name, p.icon, p.type, p.amount, p.weight, p.claim));
  console.log('Roulette prizes seeded.');
}
