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
    avatar: user.avatar,
    lastDailyClaim: user.last_daily_claim,
  };
}

export function serializeQuestion(q, { includeAnswer = false } = {}) {
  return {
    id: q.id,
    packId: q.pack_id,
    orderIndex: q.order_index,
    clues: JSON.parse(q.clues_json),
    difficulty: q.difficulty,
    rewardCoins: q.reward_coins,
    rewardXp: q.reward_xp,
    answerLength: q.answer.replace(/\s/g, '').length,
    ...(includeAnswer ? { answer: q.answer } : {}),
  };
}

export function serializePack(p) {
  return {
    id: p.id,
    orderIndex: p.order_index,
    name: p.name,
    category: p.category,
    unlockPlayerLevel: p.unlock_player_level,
  };
}
