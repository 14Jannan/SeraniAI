const redis = require("./redisClient");

const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    if (data) {
      console.log(`✅ CACHE HIT  → ${key}`);
      return JSON.parse(data);
    }
    console.log(`❌ CACHE MISS → ${key}`);
    return null;
  } catch (err) {
    console.error(`⚠️  Cache GET error [${key}]:`, err.message);
    return null; // fail silently — app still works without cache
  }
};

const setCache = async (key, value, ttl = 300) => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
    console.log(`💾 CACHE SET  → ${key} (TTL: ${ttl}s)`);
  } catch (err) {
    console.error(`⚠️  Cache SET error [${key}]:`, err.message);
  }
};

const deleteCache = async (key) => {
  try {
    await redis.del(key);
    console.log(`🗑️  CACHE DEL  → ${key}`);
  } catch (err) {
    console.error(`⚠️  Cache DEL error [${key}]:`, err.message);
  }
};

module.exports = { getCache, setCache, deleteCache };