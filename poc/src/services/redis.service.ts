import { RedisCache, RedisStore, createRedisRuntimeService } from "@naskot/node-redis-runtime";
import * as ENV from "../config/env.js";

export const redisRuntime = createRedisRuntimeService({
  persistCredentials: {
    host: ENV.POC_REDIS_PERSIST_HOST,
    port: ENV.POC_REDIS_PERSIST_PORT,
    username: ENV.POC_REDIS_PERSIST_USER,
    password: ENV.POC_REDIS_PERSIST_PASSWORD,
    lazyConnect: true,
    maxRetriesPerRequest: null,
  },
  cacheCredentials: {
    host: ENV.POC_REDIS_CACHE_HOST,
    port: ENV.POC_REDIS_CACHE_PORT,
    username: ENV.POC_REDIS_CACHE_USER,
    password: ENV.POC_REDIS_CACHE_PASSWORD,
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  },
  logger: {
    info: (message) => console.info(message),
    warn: (message) => console.warn(message),
    error: (message) => console.error(message),
  },
});

export async function assertPocRedisConnections() {
  await redisRuntime.assertPersistConnection();
  await redisRuntime.assertCacheConnection();
}

// Export classes from this service entrypoint to keep usage compatible
// with api-starter-template style imports:
// import { RedisCache, RedisStore } from "./services/redis.service"
export { RedisCache, RedisStore };
