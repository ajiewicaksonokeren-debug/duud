// XP required to reach a given player level follows a simple growing curve.
// Level N requires N * 50 total XP more than level N-1 (triangular-ish growth).
export function xpForLevel(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 2; l <= level; l++) {
    total += (l - 1) * 50;
  }
  return total;
}

export function levelFromXp(xp) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

export function xpProgress(xp) {
  const level = levelFromXp(xp);
  const currentFloor = xpForLevel(level);
  const nextCeiling = xpForLevel(level + 1);
  return {
    level,
    currentXp: xp,
    floor: currentFloor,
    ceiling: nextCeiling,
    progress: nextCeiling === currentFloor ? 1 : (xp - currentFloor) / (nextCeiling - currentFloor),
  };
}
