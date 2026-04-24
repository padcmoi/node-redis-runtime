# POC Guide

## What this POC proves

This POC is not a demo mock. It validates real behavior with:

- one app container (Express)
- one persistent Redis instance (`redis_persist`, port `6379`)
- one cache Redis instance (`redis_cache`, port `6380`)
- real `RedisStore` and `RedisCache` usage through service + intermediary files

It proves that:

- persistent writes/reads work (`RedisStore`)
- cache-aside helpers work (`RedisCache`)
- cache reset invalidates groups and forces recomputation
- Docker hot-reload works (app runs with `nodemon` in container)

## Real architecture used by the POC

- Runtime bootstrap: `poc/src/services/redis.service.ts`
- Cache instances: `poc/src/redis/cache.ts`
- Store instance: `poc/src/redis/storage.ts`
- Controllers: `poc/src/controllers/*`
- Routes: `poc/src/routes/*`
- Infra: `poc/docker-compose.yml`

## Runtime model

- `redis.service.ts` configures credentials and exports `RedisCache` / `RedisStore` constructors from `redisRuntime`
- `redis/cache.ts` instantiates cache namespaces (`agencyCache`, `geoCompletionCache`, `storageCache`, `floodCache`)
- `redis/storage.ts` instantiates persistent storage (`pocStorage`)
- Controllers only consume these instances (no hidden setup in controllers)

## Start the POC with Docker (recommended)

From repo root:

```bash
cd poc
npm ci
npm run docker:up
```

Expected:

- `redis-runtime-poc-persist` is healthy
- `redis-runtime-poc-cache` is healthy
- `redis-runtime-poc-app` is up on `http://localhost:3000`

The app container runs `nodemon` with source mount:

- command: `npm run dev -- --legacy-watch`
- mount: `./src:/app/poc/src`

## Start locally (without Docker app)

```bash
cd poc
npm ci
npm run dev
```

If Docker app is already running on port `3000`, stop it first.

## HTTP routes (current behavior)

- `GET /health`
- `POST /persist/:key`
- `GET /persist/:key`
- `GET /persist`
- `GET /cache/read?agency=...`
- `GET /cache/reset`

## End-to-end validation (copy/paste)

## 1) Health

```bash
curl -s http://localhost:3000/health
```

Expected: `{"ok":true,...}`

## 2) Persistent storage (RedisStore)

Create:

```bash
curl -s -X POST http://localhost:3000/persist/user-1 \
  -H 'content-type: application/json' \
  -d '{"email":"user1@example.com","role":"admin"}'
```

Read one:

```bash
curl -s http://localhost:3000/persist/user-1
```

List:

```bash
curl -s http://localhost:3000/persist
```

Expected:

- created payload is returned by `GET /persist/user-1`
- list contains `entries:user-1`

## 3) Cache behavior (RedisCache)

First read:

```bash
curl -s "http://localhost:3000/cache/read?agency=alpha"
```

Second read immediately:

```bash
curl -s "http://localhost:3000/cache/read?agency=alpha"
```

Expected before reset:

- cached `generatedAt` values are reused for same keys within TTL

Reset cache groups:

```bash
curl -s http://localhost:3000/cache/reset
```

Read again:

```bash
curl -s "http://localhost:3000/cache/read?agency=alpha"
```

Expected after reset:

- `generatedAt` values are recomputed (new timestamps)

## 4) Redis-level check (optional)

Persist Redis:

```bash
docker exec -it redis-runtime-poc-persist redis-cli --user user -a password KEYS '*entries*'
```

Cache Redis:

```bash
docker exec -it redis-runtime-poc-cache redis-cli -p 6380 --user user -a password KEYS '*getAllAgencyGroup*'
```

After `GET /cache/reset`, cache keys for reset groups should disappear and be recreated on next read.

## Why this POC is useful

This POC verifies exactly the integration shape expected by application code:

- constructor import compatibility (`RedisCache` / `RedisStore` via service file)
- intermediary instantiation files (`redis/cache.ts`, `redis/storage.ts`)
- route/controller usage with deterministic behavior

## Common issues and fixes

- Port `3000` already used:
  - stop local process using `3000`, or stop Docker app before local `npm run dev`
- Redis auth error:
  - ensure user/password are `user` / `password` in both Redis services
- No hot reload in Docker:
  - verify app runs `nodemon` and `./src` volume is mounted
- Cache does not seem to refresh:
  - call `GET /cache/reset`, then re-read `/cache/read`
