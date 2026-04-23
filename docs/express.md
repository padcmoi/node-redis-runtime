# Express

## Service

The runtime service centralizes Redis credentials/runtime setup and exports reusable class constructors.

### `src/services/redis.service.ts`

```ts
import { RedisCache, RedisStore, createRedisRuntimeService, jsonCodec, textCodec } from "@naskot/node-redis-runtime";

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
export { RedisCache, RedisStore };
```

## Intermediary files

### `src/redis/storage.ts`

```ts
import { RedisStore } from "../services/redis.service";

// Store (persistent)
export const storage = new RedisStore("STORAGE");
```

### `src/redis/cache.ts`

```ts
import { RedisCache } from "../services/redis.service";

const sharedCacheOptions = {
  defaultTtl: Number(process.env.CACHE_DEFAULT_TTL ?? 120),
  ttlMax: Number(process.env.CACHE_TTL_MAX ?? 600),
};

// Cache (volatile)
export const agencyCache = new RedisCache("agencyCache", sharedCacheOptions);
export const geoCompletionCache = new RedisCache("geoCompletion", sharedCacheOptions);
export const storageCache = new RedisCache("storageCache", sharedCacheOptions);

// Expected compatibility example
export const floodCache = new RedisCache("{FLOOD_KILL_SOCKET}", { defaultTtl: 2 });
```

## RedisCache

Recommended imports:

```ts
import { RedisCache } from "../services/redis.service";
import { agencyCache, geoCompletionCache, storageCache, floodCache } from "../redis/cache";
import { jsonAnyCodec, textValueCodec } from "../services/redis.service";
```

Direct package import (optional):

```ts
import { RedisCache } from "@naskot/node-redis-runtime";
```

### Constructor

```ts
const cache = new RedisCache("myCache", {
  defaultTtl: 120,
  ttlMax: 600,
});
```

### key

Builds a normalized cache key from parts.

```ts
const k = agencyCache.key("getAllAgencyGroup", "code 123");
// "agencyCache:getAllAgencyGroup:code_123"
```

### get / set

`set` writes a value with TTL. `get` reads and decodes it (or `null` if missing).

```ts
await agencyCache.set("session:abc", "ok", { codec: textValueCodec, ttl: 30 });
// set returns: undefined
const status = await agencyCache.get<string>("session:abc", { codec: textValueCodec });
// "ok"
```

### setJsonNow / getJsonNow

`setJsonNow` stores JSON in best-effort mode. `getJsonNow` returns the JSON value or `null`.

```ts
await agencyCache.setJsonNow("profile:42", { id: "42", at: Date.now() }, 45);
// returns: undefined
const profile = await agencyCache.getJsonNow<{ id: string; at: number }>("profile:42");
// { id: "42", at: 1713890000000 } | null
```

### del

Deletes one cache key.

```ts
await agencyCache.del("profile:to-delete");
// returns: undefined
```

### getCacheIfExists

Cache-aside helper with custom codec.

```ts
const byGeneric = await agencyCache.getCacheIfExists("generic:key", {
  compute: async () => ({ at: Date.now(), value: "ok" }),
  ttl: 30,
  codec: jsonAnyCodec,
  cacheNull: false,
});
// { at: 1713890000000, value: "ok" }
```

### getJsonCacheIfExists

Cache-aside helper using JSON codec.

```ts
const byJson = await agencyCache.getJsonCacheIfExists("json:key", async () => ({ at: Date.now() }), 30);
// { at: 1713890000000 }
```

### getJsonCacheByReq

Cache-aside helper with request-based variant key (params/query/url).

```ts
import type { Request } from "express";

async function readByReq(req: Request) {
  return agencyCache.getJsonCacheByReq(
    "users:list",
    req,
    async () => ({ query: req.query, params: req.params, at: Date.now() }),
    30
  );
  // { query: {...}, params: {...}, at: 1713890000000 }
}
```

### getJsonCacheByKey

Cache-aside helper with explicit variant key.

```ts
const byKey = await agencyCache.getJsonCacheByKey(
  "getAllAgencyGroup",
  "code 123",
  async () => ({ value: "code 123", at: Date.now() }),
  30
);
// { value: "code 123", at: 1713890000000 }
```

### clearCaches

Deletes a base key and all its known variants.

```ts
await agencyCache.clearCaches("getAllAgencyGroup");
await geoCompletionCache.clearCaches("geoCompletion");
await storageCache.clearCaches("getBuckets");
// each call returns: undefined
```

## RedisStore

Recommended imports:

```ts
import { RedisStore } from "../services/redis.service";
import { storage } from "../redis/storage";
import { jsonAnyCodec } from "../services/redis.service";
```

Direct package import (optional):

```ts
import { RedisStore, assertRedisConnection } from "@naskot/node-redis-runtime";
```

### Constructor

```ts
const store = new RedisStore("MY_STORE");
```

### key

Builds a normalized store key from parts.

```ts
const storeKey = storage.key("buckets", "main");
// "STORAGE:buckets:main"
```

### save

Writes persistent data for a key.

```ts
await storage.save("buckets:main", { at: Date.now() }, { codec: jsonAnyCodec });
// returns: undefined
```

### state

Reads persistent data for a key (`null` if missing).

```ts
const state = await storage.state("buckets:main", { codec: jsonAnyCodec });
// { at: 1713890000000 } | null
```

### state with fallback

Returns fallback value when key is missing or payload is invalid.

```ts
const stateWithFallback = await storage.state("buckets:missing", {
  codec: jsonAnyCodec,
  fallback: () => ({ ok: false }),
});
// { ok: false }
```

### listKeys

Lists keys in namespace (optionally by folder prefix).

```ts
const allKeys = await storage.listKeys();
const bucketKeys = await storage.listKeys("buckets");
// ["STORAGE:buckets:main", ...]
```

### listEntries

Lists key/value entries (optionally by folder prefix).

```ts
const allEntries = await storage.listEntries();
const bucketEntries = await storage.listEntries("buckets");
// [{ key: "STORAGE:buckets:main", value: "{\"at\":1713890000000}" }, ...]
```

### patch

Atomic read-modify-write with optimistic retry.

```ts
const patched = await storage.patch("buckets:main", {
  codec: jsonAnyCodec,
  fallback: () => ({ count: 0 }),
  mutate: (current) => ({ ...((current as Record<string, unknown>) ?? {}), touchedAt: Date.now() }),
  retries: 10,
});
// { count: 0, touchedAt: 1713890000000 } (example)
```

### delete

Deletes one persistent key and returns deleted count.

```ts
const deletedCount = await storage.delete("buckets:to-delete");
// 1
```

### assertRedisConnection (package helper)

```ts
import { assertRedisConnection } from "@naskot/node-redis-runtime";

await assertRedisConnection(
  {
    host: "redis_persist",
    port: 6379,
    username: "user",
    password: "password",
    lazyConnect: true,
    maxRetriesPerRequest: null,
  },
  { timeoutMs: 2500 }
);
```
