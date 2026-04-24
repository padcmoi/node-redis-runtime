# CHANGELOG

## [Unreleased] - yyyy-mm-dd

- Introduced `RedisStore` for persistent Redis state operations (`state`, `save`, `patch`, `delete`, `listKeys`, `listEntries`).
- Introduced `RedisCache` for fast TTL cache operations (`get`, `set`, `setJsonNow`, `getJsonNow`, `getJsonCacheByReq`, `getJsonCacheByKey`, `clearCaches`).
- Added `RedisRuntimeService` and `createRedisRuntimeService` for service-style integration with both persist and cache credentials.
- Changed constructor exposure: `RedisCache` and `RedisStore` are no longer exported directly from package root and are now exposed via `redisRuntime` (`createRedisRuntimeService(...).RedisCache/.RedisStore`).
- Added runtime defaults helpers: `configureRedisRuntimeDefaults`, `getRedisRuntimeDefaults`, `resetRedisRuntimeDefaults`.
- Added codecs helpers: `jsonCodec` and `textCodec`.
- Added complete unit test suite (20 tests) for store/cache/service behavior.
- Split tests by business logic into dedicated folders (`test/cache`, `test/store`, `test/service`) for easier maintenance.
- Added full Docker POC with routes/controllers, dual Redis setup (`redis_persist` + `redis_cache`) and working endpoints.
- Added ACL + Redis configuration files for POC environments.
- Updated root npm scripts to keep the package focused on library workflows only (no POC scripts in root package.json).
- Updated package exports and TypeScript surfaces for direct replacement of existing local redis libs.
- Replaced template docs with full usage documentation for root README, Express integration, and NestJS integration.
- Updated README API summary with short method descriptions for store/cache/shared helpers.
- Updated Express and NestJS docs with concise method intent and inline return examples.
- Synced Express and NestJS docs coverage to expose the same runtime capabilities per framework.
- Added dedicated `poc/package.json` with isolated scripts and `nodemon` support (`npm run dev`) for POC development.
- Updated POC wiring to use dedicated cache reset/read routes and separate cache/storage config files.
- Updated POC Docker app to run with `nodemon` in-container and watch mounted `poc/src/*` files.
- Kept cache reset endpoint as `GET /cache/reset` for simple POC testing flow.
