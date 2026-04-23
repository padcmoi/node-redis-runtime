import { beforeEach, describe, expect, it } from "vitest";
import { RedisCache, configureRedisRuntimeDefaults, jsonCodec, resetRedisRuntimeDefaults } from "../../src/index.js";
import { createFakeRedisClientFactory, createTestCredentials } from "../helpers/fake-redis.js";

describe("RedisCache basic", () => {
  beforeEach(() => {
    resetRedisRuntimeDefaults();
  });

  it("writes and reads JSON values", async () => {
    const factory = createFakeRedisClientFactory();
    const cacheCredentials = createTestCredentials("cache-basic");

    configureRedisRuntimeDefaults({
      cacheCredentials,
      createClient: factory.createClient,
    });

    const cache = new RedisCache("SESSION_CACHE", { defaultTtl: 30, ttlMax: 60 });
    await cache.setJsonNow("session:1", { userId: "u-1" }, 10);

    const value = await cache.getJsonNow<{ userId: string }>("session:1");
    expect(value).toEqual({ userId: "u-1" });
  });

  it("builds normalized keys and deletes values", async () => {
    const factory = createFakeRedisClientFactory();
    const cacheCredentials = createTestCredentials("cache-del");

    configureRedisRuntimeDefaults({
      cacheCredentials,
      createClient: factory.createClient,
    });

    const cache = new RedisCache("CACHE_NS", { defaultTtl: 30, ttlMax: 60 });
    const codec = jsonCodec<{ value: string }>();

    expect(cache.key(" users ", "id 42")).toBe("CACHE_NS:_users_:id_42");

    await cache.set("users:id_42", { value: "kept" }, { codec, ttl: 10 });
    expect(await cache.get("users:id_42", { codec })).toEqual({ value: "kept" });

    await cache.del("users:id_42");
    expect(await cache.get("users:id_42", { codec })).toBeNull();
  });

  it("throws when ttl is above ttlMax", async () => {
    const factory = createFakeRedisClientFactory();
    const cacheCredentials = createTestCredentials("cache-ttl");

    configureRedisRuntimeDefaults({
      cacheCredentials,
      createClient: factory.createClient,
    });

    const cache = new RedisCache("STRICT", { defaultTtl: 10, ttlMax: 15 });

    await expect(cache.setJsonNow("x", { ok: true }, 20)).resolves.toBeUndefined();
    await expect(cache.set("x", { ok: true }, { ttl: 20 })).rejects.toThrow("ttl must be <= 15s");
  });
});
