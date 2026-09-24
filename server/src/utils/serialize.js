import { xpProgress } from './leveling.js';
import { RUSH } from './rush.js';

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
    rushMeter: user.rush_meter ?? 0,
    rushMeterMax: RUSH.meterMax,
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
