import { beforeEach, describe, expect, it } from "vitest";
import { RedisCache, configureRedisRuntimeDefaults, jsonCodec, resetRedisRuntimeDefaults } from "../../src/index.js";
import { createFakeRedisClientFactory, createTestCredentials } from "../helpers/fake-redis.js";

describe("RedisCache helpers", () => {
  beforeEach(() => {
    resetRedisRuntimeDefaults();
  });

  it("uses compute once with getJsonCacheByKey", async () => {
    const factory = createFakeRedisClientFactory();
    const cacheCredentials = createTestCredentials("cache-compute");

    configureRedisRuntimeDefaults({
      cacheCredentials,
      createClient: factory.createClient,
    });

    const cache = new RedisCache("SEARCH", { defaultTtl: 30, ttlMax: 60 });
    let computeHits = 0;

    const first = await cache.getJsonCacheByKey(
      "agencies",
      "agency-42",
      () => {
        computeHits += 1;
        return Promise.resolve({ id: 42, name: "Agency" });
      },
      20
    );

    const second = await cache.getJsonCacheByKey(
      "agencies",
      "agency-42",
      () => {
        computeHits += 1;
        return Promise.resolve({ id: 42, name: "Agency" });
      },
      20
    );

    expect(first).toEqual({ id: 42, name: "Agency" });
    expect(second).toEqual({ id: 42, name: "Agency" });
    expect(computeHits).toBe(1);
  });

  it("recomputes getJsonCacheByKey after ttl expiration", async () => {
    const factory = createFakeRedisClientFactory();
    const cacheCredentials = createTestCredentials("cache-ttl-by-key");

    configureRedisRuntimeDefaults({
      cacheCredentials,
      createClient: factory.createClient,
    });

    const cache = new RedisCache("SEARCH_TTL", { defaultTtl: 30, ttlMax: 60 });
    let computeHits = 0;

    const first = await cache.getJsonCacheByKey(
      "getAllAgencyGroup",
      "agency-123",
      () => {
        computeHits += 1;
        return Promise.resolve({ key: "agency-123", generatedAt: Date.now() });
      },
      1
    );

    const second = await cache.getJsonCacheByKey(
      "getAllAgencyGroup",
      "agency-123",
      () => {
        computeHits += 1;
        return Promise.resolve({ key: "agency-123", generatedAt: Date.now() });
      },
      1
    );

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const third = await cache.getJsonCacheByKey(
      "getAllAgencyGroup",
      "agency-123",
      () => {
        computeHits += 1;
        return Promise.resolve({ key: "agency-123", generatedAt: Date.now() });
      },
      1
    );

    expect(computeHits).toBe(2);
    expect(second).toEqual(first);
    expect(third.generatedAt).toBeGreaterThanOrEqual(second.generatedAt);
  });

  it("uses request variant cache key", async () => {
    const factory = createFakeRedisClientFactory();
    const cacheCredentials = createTestCredentials("cache-req");

    configureRedisRuntimeDefaults({
      cacheCredentials,
      createClient: factory.createClient,
    });

    const cache = new RedisCache("API", { defaultTtl: 30, ttlMax: 60 });
    let calls = 0;

    const requestLike = {
      baseUrl: "/api/users",
      url: "/api/users?role=admin",
      params: { id: "123" },
      query: { role: "admin" },
    };

    const a = await cache.getJsonCacheByReq(
      "list",
      requestLike,
      () => {
        calls += 1;
        return Promise.resolve({ ok: true });
      },
      15
    );

    const b = await cache.getJsonCacheByReq(
      "list",
      requestLike,
      () => {
        calls += 1;
        return Promise.resolve({ ok: true });
      },
      15
    );

    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(calls).toBe(1);
  });

  it("clears base and variant keys", async () => {
    const factory = createFakeRedisClientFactory();
    const cacheCredentials = createTestCredentials("cache-clear");

    configureRedisRuntimeDefaults({
      cacheCredentials,
      createClient: factory.createClient,
    });

    const cache = new RedisCache("CACHE", { defaultTtl: 30, ttlMax: 60 });
    const codec = jsonCodec<{ value: number }>();

    await cache.set("group", { value: 1 }, { codec, ttl: 20 });
    await cache.set("group:variant", { value: 2 }, { codec, ttl: 20 });
    await cache.clearCaches("group");

    expect(await cache.get<{ value: number }>("group", { codec })).toBeNull();
    expect(await cache.get<{ value: number }>("group:variant", { codec })).toBeNull();
  });

  it("uses getCacheIfExists with custom codec", async () => {
    const factory = createFakeRedisClientFactory();
    const cacheCredentials = createTestCredentials("cache-generic");

    configureRedisRuntimeDefaults({
      cacheCredentials,
      createClient: factory.createClient,
    });

    const cache = new RedisCache("CACHE_GENERIC", { defaultTtl: 30, ttlMax: 60 });
    const codec = jsonCodec<{ tag: string }>();
    let hits = 0;

    const first = await cache.getCacheIfExists("result", {
      ttl: 20,
      codec,
      compute: () => {
        hits += 1;
        return Promise.resolve({ tag: "fresh" });
      },
    });

    const second = await cache.getCacheIfExists("result", {
      ttl: 20,
      codec,
      compute: () => {
        hits += 1;
        return Promise.resolve({ tag: "fresh" });
      },
    });

    expect(first).toEqual({ tag: "fresh" });
    expect(second).toEqual({ tag: "fresh" });
    expect(hits).toBe(1);
  });

  it("uses getJsonCacheIfExists directly", async () => {
    const factory = createFakeRedisClientFactory();
    const cacheCredentials = createTestCredentials("cache-direct");

    configureRedisRuntimeDefaults({
      cacheCredentials,
      createClient: factory.createClient,
    });

    const cache = new RedisCache("CACHE_DIRECT", { defaultTtl: 30, ttlMax: 60 });
    let hits = 0;

    const first = await cache.getJsonCacheIfExists(
      "snapshot",
      () => {
        hits += 1;
        return Promise.resolve({ at: Date.now() });
      },
      10
    );

    const second = await cache.getJsonCacheIfExists(
      "snapshot",
      () => {
        hits += 1;
        return Promise.resolve({ at: Date.now() });
      },
      10
    );

    expect(typeof first.at).toBe("number");
    expect(second).toEqual(first);
    expect(hits).toBe(1);
  });
});
