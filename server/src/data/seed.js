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

const articleCount = db.prepare('SELECT COUNT(*) AS c FROM articles').get().c;
if (articleCount === 0) {
  console.log('Seeding sample articles...');
  const insertArticle = db.prepare(
    `INSERT INTO articles (title, cover_image, excerpt, content, category, min_read_seconds, reward_tickets, reward_coins, reward_xp, quiz_question, quiz_choices_json, quiz_correct_index, published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );
  const articles = [
    {
      title: 'MPL ID Season Terbaru: Jadwal & Format Playoff',
      icon: '🏆',
      excerpt: 'Rangkuman format kompetisi MPL Indonesia musim ini, dari regular season sampai grand final.',
      content:
        'Mobile Legends Professional League Indonesia (MPL ID) kembali hadir dengan format regular season single round-robin diikuti oleh playoff double-elimination. Setiap tim akan bertanding melawan seluruh peserta lain sebelum delapan besar melaju ke babak playoff. Poin penting yang perlu diperhatikan penggemar adalah jadwal tayang setiap Sabtu dan Minggu, serta sistem best-of-three di regular season yang berubah menjadi best-of-five di semifinal dan grand final. Tim yang finis di posisi atas klasemen regular season mendapat keuntungan berupa upper bracket di playoff, sehingga mereka punya dua kesempatan sebelum tersingkir. Strategi draft hero dan ban-pick juga menjadi sorotan utama karena meta yang terus berubah setiap patch. Ikuti terus perkembangan setiap tim favoritmu dan jangan lewatkan kesempatan untuk menebak skor pertandingan di fitur Tebak Skor supaya dapat tiket roulette tambahan.',
      category: 'MPL',
      quiz: { q: 'Format playoff MPL ID musim ini menggunakan sistem apa?', choices: ['Single elimination', 'Double elimination', 'Round-robin penuh'], correct: 1 },
    },
    {
      title: 'Tips Membaca Draft Pick Ala Tim Pro MPL',
      icon: '🎮',
      excerpt: 'Kenali pola ban-pick yang sering dipakai tim-tim papan atas MPL untuk menebak strategi mereka.',
      content:
        'Salah satu aspek paling menarik dari menonton MPL adalah fase draft pick sebelum pertandingan dimulai. Tim-tim papan atas biasanya memiliki hero prioritas yang mereka amankan lebih dulu, baik untuk dipakai sendiri maupun untuk dilarang dari lawan. Pola umum yang sering terlihat adalah memprioritaskan role jungler dan mid laner terlebih dahulu karena kedua role ini paling berpengaruh terhadap tempo permainan di early game. Selain itu, kombinasi hero yang saling melengkapi seperti crowd control dengan damage dealer sering menjadi andalan. Memahami pola ini akan membantumu memprediksi susunan komposisi tim serta membuat prediksi skor pertandingan yang lebih akurat di fitur Tebak Skor.',
      category: 'Strategi',
      quiz: null,
    },
    {
      title: 'Sejarah Singkat Diamond di Mobile Legends',
      icon: '💎',
      excerpt: 'Dari mana asalnya mata uang premium yang sering jadi hadiah roulette di aplikasi ini?',
      content:
        'Diamond adalah mata uang premium di dalam game Mobile Legends: Bang Bang yang digunakan pemain untuk membeli skin, hero, dan berbagai item kosmetik lainnya. Sejak diluncurkan, Diamond telah menjadi salah satu incaran utama pemain kompetitif maupun kasual, sehingga banyak platform reward seperti aplikasi ini menjadikannya hadiah utama di roulette. Untuk mendapatkan Diamond secara gratis, pemain biasanya mengandalkan event resmi dari Moonton atau platform pihak ketiga seperti reward artikel dan tebak skor yang kamu mainkan sekarang. Selalu pastikan kamu memasukkan User ID dan Zone ID dengan benar saat proses klaim supaya Diamond dapat masuk ke akun yang tepat.',
      category: 'Umum',
      quiz: { q: 'Diamond di Mobile Legends dipakai untuk membeli apa?', choices: ['Skin & hero', 'Internet paket', 'Voucher makanan'], correct: 0 },
    },
  ];
  articles.forEach((a) => {
    insertArticle.run(
      a.title,
      a.icon,
      a.excerpt,
      a.content,
      a.category,
      Math.max(20, Math.round((a.content.split(/\s+/).length / 200) * 60)),
      1,
      15,
      15,
      a.quiz?.q || null,
      a.quiz ? JSON.stringify(a.quiz.choices) : null,
      a.quiz ? a.quiz.correct : null
    );
  });
  console.log('Sample articles seeded.');
}

const matchCount = db.prepare('SELECT COUNT(*) AS c FROM esports_matches').get().c;
if (matchCount === 0) {
  console.log('Seeding sample MPL matches...');
  const insertMatch = db.prepare(
    `INSERT INTO esports_matches (league, team_a, team_b, team_a_logo, team_b_logo, best_of, match_time, reward_exact_tickets, reward_winner_tickets)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const in5days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  insertMatch.run('MPL ID', 'RRQ Hoshi', 'ONIC Esports', '⚔️', '🔥', 3, in3days, 5, 1);
  insertMatch.run('MPL ID', 'EVOS Legends', 'Bigetron Alpha', '🦅', '🦁', 5, in5days, 8, 2);
  console.log('Sample MPL matches seeded.');
}
