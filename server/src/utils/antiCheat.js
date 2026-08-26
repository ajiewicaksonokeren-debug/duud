import crypto from 'node:crypto';

const IP_SALT = process.env.IP_HASH_SALT || 'dev-ip-salt-change-me';

// Never store raw IPs -- only a salted hash, kept just to spot patterns like
// "10 different accounts finishing articles from the same IP in one minute".
export function hashIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) || req.socket?.remoteAddress || 'unknown';
  return crypto.createHash('sha256').update(`${IP_SALT}:${ip}`).digest('hex').slice(0, 24);
}

const buckets = new Map();

// In-memory sliding-window limiter. Good enough for the current single
// backend instance (multiplayer rooms already rely on the same assumption --
// see socket/multiplayer.js); move to a shared store (Redis) if this ever
// runs behind more than one instance.
export function rateLimit({ windowMs, max, keyFn }) {
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
    if (hits.length >= max) {
      return res.status(429).json({ error: 'Terlalu banyak permintaan, coba lagi sebentar lagi.' });
    }
    hits.push(now);
    buckets.set(key, hits);
    next();
  };
}
