# NestJS

## Service

The runtime service centralizes Redis credentials/runtime setup and exports reusable class constructors.

### `src/redis/redis-runtime.service.ts`

```ts
import { Injectable } from "@nestjs/common";
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
  },
  logger: {
    info: (message) => console.info(message),
    warn: (message) => console.warn(message),
    error: (message) => console.error(message),
  },
});

@Injectable()
export class RedisRuntimeService {
  readonly redisRuntime = redisRuntime;

  readonly jsonAnyCodec = jsonCodec<unknown>();
  readonly textValueCodec = textCodec;

  assertPersistConnection() {
    return this.redisRuntime.assertPersistConnection();
  }

  assertCacheConnection() {
    return this.redisRuntime.assertCacheConnection();
  }
}

// Export class constructors for compatibility-style imports:
// import { RedisCache, RedisStore } from "./redis-runtime.service"
export const RedisCache = redisRuntime.RedisCache;
export const RedisStore = redisRuntime.RedisStore;
```

## Intermediary files

### `src/redis/redis-storage.service.ts`

```ts
import { Injectable } from "@nestjs/common";
import { RedisStore } from "./redis-runtime.service";

@Injectable()
export class RedisStorageService {
  // Store (persistent)
  readonly storage = new RedisStore("STORAGE");
}
```

### `src/redis/redis-cache.service.ts`

```ts
import { Injectable } from "@nestjs/common";
import { RedisCache } from "./redis-runtime.service";

@Injectable()
export class RedisCacheService {
  private readonly sharedCacheOptions = {
    defaultTtl: Number(process.env.CACHE_DEFAULT_TTL ?? 120),
    ttlMax: Number(process.env.CACHE_TTL_MAX ?? 600),
  };

  // Cache (volatile)
  readonly agencyCache = new RedisCache("agencyCache", this.sharedCacheOptions);
  readonly geoCompletionCache = new RedisCache("geoCompletion", this.sharedCacheOptions);
  readonly storageCache = new RedisCache("storageCache", this.sharedCacheOptions);

  // Expected compatibility example
  readonly floodCache = new RedisCache("{FLOOD_KILL_SOCKET}", { defaultTtl: 2 });
}
```

## RedisCache

Recommended imports:

```ts
import { RedisCache } from "../redis/redis-runtime.service";
import { RedisCacheService } from "../redis/redis-cache.service";
import { RedisRuntimeService } from "../redis/redis-runtime.service";
```

Runtime constructor access from package:

```ts
import { createRedisRuntimeService } from "@naskot/node-redis-runtime";

const runtime = createRedisRuntimeService({
  persistCredentials: { host: "redis_persist", port: 6379, username: "user", password: "password" },
  cacheCredentials: { host: "redis_cache", port: 6380, username: "user", password: "password" },
});

const { RedisCache } = runtime;
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
const k = cacheService.agencyCache.key("getAllAgencyGroup", "code 123");
// "agencyCache:getAllAgencyGroup:code_123"
```

### get / set

`set` writes a value with TTL. `get` reads and decodes it (or `null` if missing).

```ts
await cacheService.agencyCache.set("session:abc", "ok", { codec: runtimeService.textValueCodec, ttl: 30 });
// set returns: undefined
const status = await cacheService.agencyCache.get<string>("session:abc", { codec: runtimeService.textValueCodec });
// "ok"
```

### setJsonNow / getJsonNow

`setJsonNow` stores JSON in best-effort mode. `getJsonNow` returns the JSON value or `null`.

```ts
await cacheService.agencyCache.setJsonNow("profile:42", { id: "42", at: Date.now() }, 45);
// returns: undefined
const profile = await cacheService.agencyCache.getJsonNow<{ id: string; at: number }>("profile:42");
// { id: "42", at: 1713890000000 } | null
```

### del

Deletes one cache key.

```ts
await cacheService.agencyCache.del("profile:to-delete");
// returns: undefined
```

### getCacheIfExists

Cache-aside helper with custom codec.

```ts
const byGeneric = await cacheService.agencyCache.getCacheIfExists("generic:key", {
  compute: async () => ({ at: Date.now(), value: "ok" }),
  ttl: 30,
  codec: runtimeService.jsonAnyCodec,
  cacheNull: false,
});
// { at: 1713890000000, value: "ok" }
```

### getJsonCacheIfExists

Cache-aside helper using JSON codec.

```ts
const byJson = await cacheService.agencyCache.getJsonCacheIfExists("json:key", async () => ({ at: Date.now() }), 30);
// { at: 1713890000000 }
```

### getJsonCacheByReq

Cache-aside helper with request-based variant key (params/query/url).

```ts
import type { Request } from "express";

async function readByReq(req: Request) {
  return cacheService.agencyCache.getJsonCacheByReq(
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
const byKey = await cacheService.agencyCache.getJsonCacheByKey(
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
await cacheService.agencyCache.clearCaches("getAllAgencyGroup");
await cacheService.geoCompletionCache.clearCaches("geoCompletion");
await cacheService.storageCache.clearCaches("getBuckets");
// each call returns: undefined
```

## RedisStore

Recommended imports:

```ts
import { RedisStore } from "../redis/redis-runtime.service";
import { RedisStorageService } from "../redis/redis-storage.service";
import { RedisRuntimeService } from "../redis/redis-runtime.service";
```

Runtime constructor access from package:

```ts
import { assertRedisConnection, createRedisRuntimeService } from "@naskot/node-redis-runtime";

const runtime = createRedisRuntimeService({
  persistCredentials: { host: "redis_persist", port: 6379, username: "user", password: "password" },
  cacheCredentials: { host: "redis_cache", port: 6380, username: "user", password: "password" },
});

const { RedisStore } = runtime;
```

### Constructor

```ts
const store = new RedisStore("MY_STORE");
```

### key

Builds a normalized store key from parts.

```ts
const storeKey = storageService.storage.key("buckets", "main");
// "STORAGE:buckets:main"
```

### save

Writes persistent data for a key.

```ts
await storageService.storage.save("buckets:main", { at: Date.now() }, { codec: runtimeService.jsonAnyCodec });
// returns: undefined
```

### state

Reads persistent data for a key (`null` if missing).

```ts
const state = await storageService.storage.state("buckets:main", { codec: runtimeService.jsonAnyCodec });
// { at: 1713890000000 } | null
```

### state with fallback

Returns fallback value when key is missing or payload is invalid.

```ts
const stateWithFallback = await storageService.storage.state("buckets:missing", {
  codec: runtimeService.jsonAnyCodec,
  fallback: () => ({ ok: false }),
});
// { ok: false }
```

### listKeys

Lists keys in namespace (optionally by folder prefix).

```ts
const allKeys = await storageService.storage.listKeys();
const bucketKeys = await storageService.storage.listKeys("buckets");
// ["STORAGE:buckets:main", ...]
```

### listEntries

Lists key/value entries (optionally by folder prefix).

```ts
const allEntries = await storageService.storage.listEntries();
const bucketEntries = await storageService.storage.listEntries("buckets");
// [{ key: "STORAGE:buckets:main", value: "{\"at\":1713890000000}" }, ...]
```

### patch

Atomic read-modify-write with optimistic retry.

```ts
const patched = await storageService.storage.patch("buckets:main", {
  codec: runtimeService.jsonAnyCodec,
  fallback: () => ({ count: 0 }),
  mutate: (current) => ({ ...((current as Record<string, unknown>) ?? {}), touchedAt: Date.now() }),
  retries: 10,
});
// { count: 0, touchedAt: 1713890000000 } (example)
```

### delete

Deletes one persistent key and returns deleted count.

```ts
const deletedCount = await storageService.storage.delete("buckets:to-delete");
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
