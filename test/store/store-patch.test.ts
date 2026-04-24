import { beforeEach, describe, expect, it } from "vitest";
import { createRedisRuntimeService, jsonCodec, resetRedisRuntimeDefaults } from "../../src/index.js";
import { createFakeRedisClientFactory, createTestCredentials } from "../helpers/fake-redis.js";

describe("RedisStore patch", () => {
  beforeEach(() => {
    resetRedisRuntimeDefaults();
  });

  it("patch retries and succeeds after one transaction conflict", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("store-patch");

    const redisRuntime = createRedisRuntimeService({
      persistCredentials,
      cacheCredentials: createTestCredentials("store-patch-cache"),
      createClient: factory.createClient,
    });

    const { RedisStore } = redisRuntime;
    const store = new RedisStore("COUNTERS");
    const codec = jsonCodec<{ count: number }>();

    await store.save("hits", { count: 1 }, { codec });

    const client = factory.getClient(persistCredentials);
    client.failNextExec();

    const next = await store.patch("hits", {
      codec,
      fallback: () => ({ count: 0 }),
      retries: 3,
      mutate: (current) => ({ count: current.count + 1 }),
    });

    expect(next).toEqual({ count: 2 });
    expect(await store.state("hits", { codec })).toEqual({ count: 2 });
  });

  it("throws after retries are exhausted", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("store-patch-fail");

    const redisRuntime = createRedisRuntimeService({
      persistCredentials,
      cacheCredentials: createTestCredentials("store-patch-fail-cache"),
      createClient: factory.createClient,
    });

    const { RedisStore } = redisRuntime;
    const store = new RedisStore("COUNTERS_FAIL");
    const codec = jsonCodec<{ count: number }>();

    await store.save("hits", { count: 1 }, { codec });

    const client = factory.getClient(persistCredentials);
    client.failNextExec();

    await expect(
      store.patch("hits", {
        codec,
        fallback: () => ({ count: 0 }),
        retries: 1,
        mutate: (current) => ({ count: current.count + 1 }),
      })
    ).rejects.toThrow("patch failed after 1 retries");
  });
});
