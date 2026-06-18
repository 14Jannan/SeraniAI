require("dotenv").config();
const { getCache, setCache, deleteCache } = require("./utils/cache");
const redis = require("./utils/redisClient");

async function test() {
  console.log("\n🚀 Starting Redis tests...\n");

  // 1. Set a value
  await setCache("test:key", { message: "Hello from Redis!" }, 60);

  // 2. Read it back
  const result = await getCache("test:key");
  console.log("   Data:", result);

  // 3. Check TTL in Redis directly
  const ttl = await redis.ttl("test:key");
  console.log(`⏱️  TTL remaining: ${ttl} seconds`);

  // 4. Hit it again — should show CACHE HIT
  await getCache("test:key");

  // 5. Delete it
  await deleteCache("test:key");

  // 6. Read again — should be null (CACHE MISS)
  const empty = await getCache("test:key");
  console.log("   After delete:", empty);

  console.log("\n✅ All Redis tests passed!\n");
  process.exit(0);
}

test().catch(console.error);
