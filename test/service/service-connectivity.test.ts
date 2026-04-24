import { beforeEach, describe, expect, it } from "vitest";
import { assertRedisConnection, createRedisRuntimeService, resetRedisRuntimeDefaults } from "../../src/index.js";

describe("RedisRuntimeService connectivity", () => {
  beforeEach(() => {
    resetRedisRuntimeDefaults();
  });

  it("fails assert connection checks with unreachable redis", async () => {
    const service = createRedisRuntimeService({
      persistCredentials: {
        host: "127.0.0.1",
        port: 1,
        username: "user",
        password: "password",
      },
      cacheCredentials: {
        host: "127.0.0.1",
        port: 1,
        username: "user",
        password: "password",
      },
    });

    await expect(service.assertPersistConnection({ timeoutMs: 150 })).rejects.toBeInstanceOf(Error);
    await expect(service.assertCacheConnection({ timeoutMs: 150 })).rejects.toBeInstanceOf(Error);
  });

  it("fails assertRedisConnection helper with unreachable redis", async () => {
    await expect(
      assertRedisConnection(
        {
          host: "127.0.0.1",
          port: 1,
          username: "user",
          password: "password",
        },
        { timeoutMs: 150 }
      )
    ).rejects.toBeInstanceOf(Error);
  });
});
