import { beforeEach, describe, expect, it } from "vitest";
import { RedisStore, configureRedisRuntimeDefaults, jsonCodec, resetRedisRuntimeDefaults } from "../../src/index.js";
import { createFakeRedisClientFactory, createTestCredentials } from "../helpers/fake-redis.js";

describe("RedisStore patch", () => {
  beforeEach(() => {
    resetRedisRuntimeDefaults();
  });

  it("patch retries and succeeds after one transaction conflict", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("store-patch");

    configureRedisRuntimeDefaults({
      persistCredentials,
      createClient: factory.createClient,
    });

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
});
