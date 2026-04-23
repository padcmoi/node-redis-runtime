import { beforeEach, describe, expect, it } from "vitest";
import { createRedisRuntimeService, jsonCodec, resetRedisRuntimeDefaults } from "../../src/index.js";
import { createFakeRedisClientFactory, createTestCredentials } from "../helpers/fake-redis.js";

describe("RedisRuntimeService runtime", () => {
  beforeEach(() => {
    resetRedisRuntimeDefaults();
  });

  it("creates store and cache instances with configured credentials", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("service-persist");
    const cacheCredentials = createTestCredentials("service-cache");

    const service = createRedisRuntimeService({
      persistCredentials,
      cacheCredentials,
      createClient: factory.createClient,
    });

    const store = service.store("SERVICE_STORE");
    const cache = service.cache("SERVICE_CACHE", { defaultTtl: 10, ttlMax: 20 });
    const codec = jsonCodec<{ ok: boolean }>();

    await store.save("hello", { ok: true }, { codec });
    await cache.set("hello", { ok: true }, { codec, ttl: 10 });

    expect(await store.state("hello", { codec })).toEqual({ ok: true });
    expect(await cache.get("hello", { codec })).toEqual({ ok: true });
  });

  it("supports per-call credentials override for store and cache", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("service-default-persist");
    const cacheCredentials = createTestCredentials("service-default-cache");
    const persistOverride = createTestCredentials("service-override-persist");
    const cacheOverride = createTestCredentials("service-override-cache");

    const service = createRedisRuntimeService({
      persistCredentials,
      cacheCredentials,
      createClient: factory.createClient,
    });

    const store = service.store("OVERRIDE_STORE", persistOverride);
    const cache = service.cache("OVERRIDE_CACHE", {
      credentials: cacheOverride,
      defaultTtl: 10,
      ttlMax: 20,
    });
    const codec = jsonCodec<{ ok: boolean }>();

    await store.save("state", { ok: true }, { codec });
    await cache.set("state", { ok: true }, { codec, ttl: 10 });

    const persistClient = factory.getClient(persistOverride);
    const cacheClient = factory.getClient(cacheOverride);

    expect(await persistClient.get("OVERRIDE_STORE:state")).not.toBeNull();
    expect(await cacheClient.get("OVERRIDE_CACHE:state")).not.toBeNull();

    expect(() => factory.getClient(persistCredentials)).toThrow();
    expect(() => factory.getClient(cacheCredentials)).toThrow();
  });
});
