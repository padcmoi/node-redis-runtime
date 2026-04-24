import { createRedisRuntimeService, jsonCodec, textCodec } from "@naskot/node-redis-runtime";

export const redisRuntime = createRedisRuntimeService({
  persistCredentials: {
    host: process.env.REDIS_PERSIST_HOST ?? "redis_persist",
    port: Number(process.env.REDIS_PERSIST_PORT ?? 6379),
    username: process.env.REDIS_PERSIST_USER ?? "user",
    password: process.env.REDIS_PERSIST_PASSWORD ?? "password",
    lazyConnect: true,
    maxRetriesPerRequest: null,
  },
  cacheCredentials: {
    host: process.env.REDIS_CACHE_HOST ?? "redis_cache",
    port: Number(process.env.REDIS_CACHE_PORT ?? 6380),
    username: process.env.REDIS_CACHE_USER ?? "user",
    password: process.env.REDIS_CACHE_PASSWORD ?? "password",
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

export const jsonAnyCodec = jsonCodec<unknown>();
export const textValueCodec = textCodec;

export async function assertRedisConnections() {
  await redisRuntime.assertPersistConnection();
  await redisRuntime.assertCacheConnection();
}

// Export class constructors for compatibility-style imports:
// import { RedisCache, RedisStore } from "./services/redis.service"
export const RedisCache = redisRuntime.RedisCache;
export const RedisStore = redisRuntime.RedisStore;
