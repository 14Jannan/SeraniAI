const hasRedisConfig = Boolean(
  process.env.REDIS_URL || process.env.REDIS_HOST || process.env.REDIS_PORT
);

const createDisabledRedisClient = () => ({
  status: "disabled",
  isDisabled: true,
  on() {},
  connect() {
    return Promise.resolve();
  },
  quit() {
    return Promise.resolve();
  },
  disconnect() {},
  get() {
    return Promise.resolve(null);
  },
  set() {
    return Promise.resolve("OK");
  },
  del() {
    return Promise.resolve(0);
  },
  ttl() {
    return Promise.resolve(-1);
  },
});

let redis;

if (!hasRedisConfig) {
  redis = createDisabledRedisClient();
} else {
  const Redis = require("ioredis");

  redis = new Redis(
    process.env.REDIS_URL || {
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    }
  );

  redis.on("connect", () => console.log("✅ Redis connected"));
  redis.on("error", (err) => console.error("❌ Redis error:", err.message));
}

module.exports = redis;