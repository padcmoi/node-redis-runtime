import { beforeEach, describe, expect, it } from "vitest";
import { createRedisRuntimeService, jsonCodec, resetRedisRuntimeDefaults } from "../../src/index.js";
import { createFakeRedisClientFactory, createTestCredentials } from "../helpers/fake-redis.js";

describe("RedisStore state", () => {
  beforeEach(() => {
    resetRedisRuntimeDefaults();
  });

  it("saves and reads JSON state", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("store-save");

    const redisRuntime = createRedisRuntimeService({
      persistCredentials,
      cacheCredentials: createTestCredentials("store-save-cache"),
      createClient: factory.createClient,
    });

    const { RedisStore } = redisRuntime;
    const store = new RedisStore("AUTH_STATE");
    const codec = jsonCodec<{ userId: string; tries: number }>();

    await store.save("login:john", { userId: "john", tries: 2 }, { codec });
    expect(await store.state("login:john", { codec })).toEqual({ userId: "john", tries: 2 });
  });

  it("returns fallback when payload is corrupted", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("store-fallback");

    const redisRuntime = createRedisRuntimeService({
      persistCredentials,
      cacheCredentials: createTestCredentials("store-fallback-cache"),
      createClient: factory.createClient,
    });

    const { RedisStore } = redisRuntime;
    const store = new RedisStore("AUTH_STATE");
    const codec = jsonCodec<{ userId: string }>();

    const client = factory.getClient(persistCredentials);
    await client.set("AUTH_STATE:bad_payload", "{invalid-json");

    const value = await store.state("bad_payload", {
      codec,
      fallback: () => ({ userId: "fallback" }),
    });

    expect(value).toEqual({ userId: "fallback" });
  });

  it("returns fallback when key is missing", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("store-missing");

    const redisRuntime = createRedisRuntimeService({
      persistCredentials,
      cacheCredentials: createTestCredentials("store-missing-cache"),
      createClient: factory.createClient,
    });

    const { RedisStore } = redisRuntime;
    const store = new RedisStore("AUTH_STATE");
    const codec = jsonCodec<{ userId: string }>();

    const value = await store.state("missing", {
      codec,
      fallback: () => ({ userId: "fallback-missing" }),
    });

    expect(value).toEqual({ userId: "fallback-missing" });
  });

  it("deletes saved values", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("store-delete");

    const redisRuntime = createRedisRuntimeService({
      persistCredentials,
      cacheCredentials: createTestCredentials("store-delete-cache"),
      createClient: factory.createClient,
    });

    const { RedisStore } = redisRuntime;
    const store = new RedisStore("TOKENS");
    const codec = jsonCodec<{ active: boolean }>();

    await store.save("refresh:john", { active: true }, { codec });
    expect(await store.state("refresh:john", { codec })).toEqual({ active: true });

    const deleted = await store.delete("refresh:john");
    expect(deleted).toBe(1);
    expect(await store.state("refresh:john", { codec })).toBeNull();
  });

  it("returns 0 when deleting a missing key", async () => {
    const factory = createFakeRedisClientFactory();
    const persistCredentials = createTestCredentials("store-delete-missing");

    const redisRuntime = createRedisRuntimeService({
      persistCredentials,
      cacheCredentials: createTestCredentials("store-delete-missing-cache"),
      createClient: factory.createClient,
    });

    const { RedisStore } = redisRuntime;
    const store = new RedisStore("TOKENS");

    const deleted = await store.delete("missing");
    expect(deleted).toBe(0);
  });
});
