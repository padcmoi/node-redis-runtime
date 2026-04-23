import { beforeEach, describe, expect, it } from "vitest";
import { createRedisRuntimeService, resetRedisRuntimeDefaults } from "../../src/index.js";

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
});
