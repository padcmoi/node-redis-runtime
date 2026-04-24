import { describe, expect, it } from "vitest";
import * as runtimeExports from "../../src/index.js";

describe("Public API", () => {
  it("does not export RedisCache and RedisStore directly", () => {
    expect("RedisCache" in runtimeExports).toBe(false);
    expect("RedisStore" in runtimeExports).toBe(false);
  });
});
