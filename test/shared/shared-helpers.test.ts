import { beforeEach, describe, expect, it } from "vitest";
import {
  configureRedisRuntimeDefaults,
  getRedisRuntimeDefaults,
  jsonCodec,
  resetRedisRuntimeDefaults,
  textCodec,
} from "../../src/index.js";
import { createTestCredentials } from "../helpers/fake-redis.js";

describe("Shared helpers", () => {
  beforeEach(() => {
    resetRedisRuntimeDefaults();
  });

  it("encodes and decodes values with jsonCodec and textCodec", () => {
    const codec = jsonCodec<{ id: string; count: number }>();

    const jsonRaw = codec.encode({ id: "u-1", count: 2 });
    const textRaw = textCodec.encode("hello");

    expect(codec.decode(jsonRaw)).toEqual({ id: "u-1", count: 2 });
    expect(textCodec.decode(textRaw)).toBe("hello");
  });

  it("configures, exposes, then resets runtime defaults", () => {
    const cacheCredentials = createTestCredentials("defaults-cache");
    const persistCredentials = createTestCredentials("defaults-persist");
    const logger = {
      info: (_message: string) => undefined,
      warn: (_message: string) => undefined,
      error: (_message: string) => undefined,
    };

    configureRedisRuntimeDefaults({
      cacheCredentials,
      persistCredentials,
      logger,
    });

    const configured = getRedisRuntimeDefaults();
    expect(configured.cacheCredentials).toEqual(cacheCredentials);
    expect(configured.persistCredentials).toEqual(persistCredentials);
    expect(configured.logger).toBe(logger);

    resetRedisRuntimeDefaults();
    const cleared = getRedisRuntimeDefaults();
    expect(cleared.cacheCredentials).toBeNull();
    expect(cleared.persistCredentials).toBeNull();
    expect(cleared.logger).toBeNull();
    expect(cleared.createClient).toBeNull();
  });
});
