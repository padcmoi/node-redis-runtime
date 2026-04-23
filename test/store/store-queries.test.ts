import { beforeEach, describe, expect, it } from "vitest";
import { RedisStore, configureRedisRuntimeDefaults, jsonCodec, resetRedisRuntimeDefaults } from "../../src/index.js";
import { createFakeRedisClientFactory, createTestCredentials } from "../helpers/fake-redis.js";

describe("RedisStore queries", () => {
  beforeEach(() => {
    resetRedisRuntimeDefaults();
  });

  it("lists entries by folder", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("store-list");

    configureRedisRuntimeDefaults({
      persistCredentials,
      createClient: factory.createClient,
    });

    const store = new RedisStore("APP");
    const codec = jsonCodec<{ value: string }>();

    await store.save("entries:alpha", { value: "A" }, { codec });
    await store.save("entries:beta", { value: "B" }, { codec });
    await store.save("other:item", { value: "C" }, { codec });

    const entries = await store.listEntries("entries");
    const keys = entries.map((entry) => entry.key).sort();
    expect(keys).toEqual(["APP:entries:alpha", "APP:entries:beta"]);
  });

  it("builds normalized keys and lists keys by folder", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("store-keys");

    configureRedisRuntimeDefaults({
      persistCredentials,
      createClient: factory.createClient,
    });

    const store = new RedisStore("APP_STORE");
    const codec = jsonCodec<{ value: string }>();

    expect(store.key(" users ", "id 42")).toBe("APP_STORE:_users_:id_42");

    await store.save("users:alpha", { value: "A" }, { codec });
    await store.save("users:beta", { value: "B" }, { codec });
    await store.save("other:item", { value: "C" }, { codec });

    const allKeys = (await store.listKeys()).sort();
    const userKeys = (await store.listKeys("users")).sort();

    expect(allKeys).toEqual(["APP_STORE:other:item", "APP_STORE:users:alpha", "APP_STORE:users:beta"]);
    expect(userKeys).toEqual(["APP_STORE:users:alpha", "APP_STORE:users:beta"]);
  });
});
