const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let client = null;

function getRedis() {
  if (!client) {
    client = new Redis(REDIS_URL, {
      lazyConnect:          true,
      enableOfflineQueue:   false, // fail fast when Redis is down, don't queue
      maxRetriesPerRequest: 1,
    });
    client.on('connect', () => console.log('[Redis] Connected'));
    client.on('error',   (err) => console.error('[Redis]', err.message));
  }
  return client;
}

// Cache keys
const KEYS = {
  QUEUE_METRICS:  'queue:metrics',
  ADMIN_STATS:    'admin:stats',
  ADMIN_COUNTERS: 'admin:counters',
  ADMIN_TICKETS:  'admin:tickets',
};

async function cacheGet(key) {
  try {
    const val = await getRedis().get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 5) {
  try {
    await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // non-fatal — fall through to DB on next request
  }
}

async function cacheDel(...keys) {
  try {
    if (keys.length > 0) await getRedis().del(...keys);
  } catch {
    // non-fatal
  }
}

// Invalidation helpers called by routes
async function invalidateAll() {
  await cacheDel(KEYS.QUEUE_METRICS, KEYS.ADMIN_STATS, KEYS.ADMIN_COUNTERS, KEYS.ADMIN_TICKETS);
}

async function invalidateStatsAndTickets() {
  await cacheDel(KEYS.QUEUE_METRICS, KEYS.ADMIN_STATS, KEYS.ADMIN_TICKETS);
}

async function invalidateCounters() {
  await cacheDel(KEYS.ADMIN_COUNTERS, KEYS.ADMIN_STATS);
}

module.exports = { KEYS, cacheGet, cacheSet, cacheDel, invalidateAll, invalidateStatsAndTickets, invalidateCounters };
