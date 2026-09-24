// Rush Moment tuning. Rush questions are one-word answers of at most `maxLetters`.
// Deliberately brutal: mobile typing averages ~3 letters/s, so long answers in <2s are near-impossible.
export const RUSH = {
  meterMax: 5, // perfect answers needed to fill the tank
  fastMs: 2000, // a guess must be completed within 2s
  questions: 10,
  totalMs: 15000,
  maxLetters: 10,
  graceMs: 500, // network round-trip allowance, since the server measures time
  prizeName: process.env.RUSH_PRIZE_NAME || 'Uang tunai Rp10.000',
  prizeAmount: Number(process.env.RUSH_PRIZE_AMOUNT) || 10000,
  dailyWinners: Number(process.env.RUSH_DAILY_WINNERS) || 5,
};
