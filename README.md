# @naskot/node-redis-runtime

Redis runtime for Node.js with two complementary layers:

- RedisStore for persistent state (durable data)
- RedisCache for fast volatile cache (TTL and cache-aside helpers)

The package is framework-agnostic and does not read process environment values internally.

## Install

Install the package with npm in your application.

## API summary

### Runtime options

`createRedisRuntimeService(options)` accepts:

- `persistCredentials`: Redis credentials/options for persistent data (RedisStore).
- `cacheCredentials`: Redis credentials/options for volatile data (RedisCache).
- `logger` (optional): `{ info, warn, error }` hooks used by the runtime.

Both `persistCredentials` and `cacheCredentials` support standard ioredis options, including:

- `host`, `port`, `username`, `password`
- `lazyConnect`
- `maxRetriesPerRequest`
- `enableReadyCheck`

`enableReadyCheck` is forwarded to ioredis:

- `true`: run Redis ready check before emitting `ready`.
- `false`: skip Redis ready check.

### High-level service

- `createRedisRuntimeService(options)`: create one runtime instance and apply defaults.
- `RedisRuntimeService`: runtime class behind the factory.
- `store(namespace, credentials optional)`: create a `RedisStore` bound to a namespace.
- `cache(namespace, options optional)`: create a `RedisCache` bound to a namespace.
- `redisRuntime.RedisStore`: constructor exposed by the runtime instance.
- `redisRuntime.RedisCache`: constructor exposed by the runtime instance.
- `configureDefaults()`: push runtime credentials/logger into global defaults for constructors.

### Persistent store

- `key(...parts)`: build a normalized persistent key (`STORAGE:user:42`).
- `listKeys(folder?)`: list keys in namespace, optionally filtered by folder.
- `listEntries(folder?)`: list `{ key, value }` pairs for the namespace/folder.
- `state(name, { codec, fallback? })`: read and decode one value (`null` or fallback if missing/invalid).
- `save(name, value, { codec })`: encode and persist one value.
- `delete(name)`: delete one key and return deleted count (`0` or `1`).
- `patch(name, { codec, fallback, mutate, retries? })`: atomic read-modify-write with optimistic retries.
- `assertRedisConnection(credentials, { timeoutMs? })`: ping a Redis endpoint and throw if unreachable.

### Cache

- `key(...parts)`: build a normalized cache key (`agencyCache:getAllAgencyGroup:code_123`).
- `get(name, { codec? })`: read and decode cached value (`null` if missing/invalid).
- `set(name, value, { codec?, ttl? })`: encode and cache one value with TTL.
- `setJsonNow(name, value, ttl?)`: best-effort JSON write shortcut.
- `getJsonNow(name)`: JSON read shortcut.
- `getCacheIfExists(name, { compute, ttl?, codec?, cacheNull? })`: generic cache-aside helper.
- `getJsonCacheIfExists(name, compute, ttl?)`: JSON cache-aside helper.
- `getJsonCacheByReq(name, req, compute, ttl?)`: JSON cache-aside with request-based variant key.
- `getJsonCacheByKey(name, key, compute, ttl?)`: JSON cache-aside with explicit variant key.
- `clearCaches(...names)`: clear base keys and their variants.

### Shared helpers

- `jsonCodec<T>()`: typed JSON codec for objects/arrays.
- `textCodec`: plain string codec (`"abc"` in, `"abc"` out), useful for simple flags/tokens.
- `configureRedisRuntimeDefaults(...)`: set global fallback credentials/logger/client factory.
- `getRedisRuntimeDefaults()`: read current global defaults.
- `resetRedisRuntimeDefaults()`: clear all global defaults.

Codec quick examples:

```ts
import { jsonCodec, textCodec } from "@naskot/node-redis-runtime";

const userCodec = jsonCodec<{ id: string; count: number }>();
const stringCodec = textCodec;
```

## Migration

This package keeps method naming aligned with api-starter-template usage so local Redis helpers can be replaced with this runtime package.

## Integration guides

- [Express](./docs/express.md)
- [NestJS](./docs/nestjs.md)
- [POC guide](./docs/poc.md)

## POC

A complete Docker POC is included with one app container, one persistent Redis, and one cache Redis.

The Docker app runs with nodemon in container for live reload on source changes.

Main routes:

- GET /health
- POST /persist/:key
- GET /persist/:key
- GET /persist
- GET /cache/read?agency=...
- GET /cache/reset

## Development

Use the standard workflow: install dependencies, run lint, typecheck, tests, build, and CI script.

## Rule

Never read process.env inside the library. Resolve environment in your app service/provider layer and pass plain configuration to this package.
