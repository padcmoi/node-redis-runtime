import { beforeEach, describe, expect, it } from "vitest";
import { RedisRuntimeService, jsonCodec, resetRedisRuntimeDefaults } from "../../src/index.js";
import { createFakeRedisClientFactory, createTestCredentials } from "../helpers/fake-redis.js";

describe("RedisRuntimeService class", () => {
  beforeEach(() => {
    resetRedisRuntimeDefaults();
  });

  it("works as a class behind the factory", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("class-persist");
    const cacheCredentials = createTestCredentials("class-cache");
    const codec = jsonCodec<{ ok: boolean }>();

    const service = new RedisRuntimeService({
      persistCredentials,
      cacheCredentials,
      createClient: factory.createClient,
    });
    service.configureDefaults();

    const store = service.store("CLASS_STORE");
    const cache = service.cache("CLASS_CACHE", { defaultTtl: 10, ttlMax: 20 });

    await store.save("state", { ok: true }, { codec });
    await cache.set("state", { ok: true }, { codec, ttl: 10 });

    expect(await store.state("state", { codec })).toEqual({ ok: true });
    expect(await cache.get("state", { codec })).toEqual({ ok: true });
  });

  it("requires configureDefaults before using runtime constructors without explicit credentials", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("class-defaults-persist");
    const cacheCredentials = createTestCredentials("class-defaults-cache");
    const codec = jsonCodec<{ value: string }>();

    const service = new RedisRuntimeService({
      persistCredentials,
      cacheCredentials,
      createClient: factory.createClient,
    });

    expect(() => new service.RedisStore("CLASS_NS")).toThrow("credentials are required");
    expect(() => new service.RedisCache("CLASS_NS")).toThrow("credentials are required");

    expect(service.configureDefaults()).toBe(service);

    const store = new service.RedisStore("CLASS_NS");
    const cache = new service.RedisCache("CLASS_NS_CACHE", { defaultTtl: 10, ttlMax: 20 });

    await store.save("x", { value: "ok" }, { codec });
    await cache.set("x", { value: "ok" }, { codec, ttl: 10 });

    expect(await store.state("x", { codec })).toEqual({ value: "ok" });
    expect(await cache.get("x", { codec })).toEqual({ value: "ok" });
  });
});
