import { POC_CACHE_DEFAULT_TTL, POC_CACHE_TTL_MAX } from "../config/env.js";
import { RedisCache } from "../services/redis.service.js";

const sharedCacheOptions = {
  defaultTtl: POC_CACHE_DEFAULT_TTL,
  ttlMax: POC_CACHE_TTL_MAX,
};

// Mirrors api-starter-template naming style.
export const agencyCache = new RedisCache("agencyCache", sharedCacheOptions);
export const geoCompletionCache = new RedisCache("geoCompletion", sharedCacheOptions);
export const storageCache = new RedisCache("storageCache", sharedCacheOptions);

// Compatibility example requested for POC.
export const floodCache = new RedisCache("{FLOOD_KILL_SOCKET}", { defaultTtl: 2 });
