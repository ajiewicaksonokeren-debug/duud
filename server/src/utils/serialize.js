import { xpProgress } from './leveling.js';

export function serializeUser(user) {
  const prog = xpProgress(user.xp);
  return {
    id: user.id,
    username: user.username,
    isAdmin: !!user.is_admin,
    coins: user.coins,
    xp: user.xp,
    playerLevel: prog.level,
    xpFloor: prog.floor,
    xpCeiling: prog.ceiling,
    xpProgress: prog.progress,
    rouletteTickets: user.roulette_tickets,
    avatar: user.avatar,
    lastDailyClaim: user.last_daily_claim,
  };
}

export function serializeQuestion(q, { includeAnswer = false } = {}) {
  return {
    id: q.id,
    categoryId: q.category_id,
    levelNumber: q.level_number,
    clues: JSON.parse(q.clues_json),
    difficulty: q.difficulty,
    rewardCoins: q.reward_coins,
    rewardXp: q.reward_xp,
    answerLength: q.answer.replace(/\s/g, '').length,
    ...(includeAnswer ? { answer: q.answer } : {}),
  };
}

export function serializeCategory(c) {
  return {
    id: c.id,
    orderIndex: c.order_index,
    name: c.name,
    icon: c.icon,
    description: c.description,
    unlockPlayerLevel: c.unlock_player_level,
  };
}

export function serializePrize(p, { includeWeight = false } = {}) {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon,
    type: p.type,
    amount: p.amount,
    requiresClaim: !!p.requires_claim,
    active: !!p.active,
    ...(includeWeight ? { weight: p.weight } : {}),
  };
}

export function serializeArticle(a, { includeQuizAnswer = false, readState = null } = {}) {
  return {
    id: a.id,
    title: a.title,
    coverImage: a.cover_image,
    excerpt: a.excerpt,
    content: a.content,
    category: a.category,
    minReadSeconds: a.min_read_seconds,
    rewardTickets: a.reward_tickets,
    rewardCoins: a.reward_coins,
    rewardXp: a.reward_xp,
    hasQuiz: !!a.quiz_question,
    quizQuestion: a.quiz_question || null,
    quizChoices: a.quiz_choices_json ? JSON.parse(a.quiz_choices_json) : null,
    ...(includeQuizAnswer ? { quizCorrectIndex: a.quiz_correct_index } : {}),
    published: !!a.published,
    createdAt: a.created_at,
    ...(readState ? { readState } : {}),
  };
}

export function serializeMatch(m, { prediction = null, now = Date.now() } = {}) {
  const locked = !!m.settled || now >= new Date(m.match_time).getTime();
  return {
    id: m.id,
    league: m.league,
    teamA: m.team_a,
    teamB: m.team_b,
    teamALogo: m.team_a_logo,
    teamBLogo: m.team_b_logo,
    bestOf: m.best_of,
    matchTime: m.match_time,
    locked,
    settled: !!m.settled,
    status: m.settled ? 'finished' : locked ? 'locked' : 'upcoming',
    scoreA: m.settled ? m.score_a : null,
    scoreB: m.settled ? m.score_b : null,
    rewardExactTickets: m.reward_exact_tickets,
    rewardWinnerTickets: m.reward_winner_tickets,
    myPrediction: prediction
      ? {
          scoreA: prediction.pred_score_a,
          scoreB: prediction.pred_score_b,
          result: prediction.result,
          ticketsAwarded: prediction.tickets_awarded,
          coinsAwarded: prediction.coins_awarded,
          xpAwarded: prediction.xp_awarded,
        }
      : null,
  };
}

export function serializeClaim(c) {
  return {
    id: c.id,
    prizeName: c.prize_name,
    prizeType: c.prize_type,
    prizeAmount: c.prize_amount,
    status: c.status,
    createdAt: c.created_at,
    expiresAt: c.expires_at,
    claimedAt: c.claimed_at,
    formData: c.form_data_json ? JSON.parse(c.form_data_json) : null,
  };
}
