import { Redis } from "ioredis";
import { RedisPool } from "./redisShared.js";
import { getRedisRuntimeDefaults } from "./runtimeDefaults.js";
import type { Codec, RedisCredentials, RedisPoolEntry } from "./types.js";

const storePool = new RedisPool("REDIS_STORE");

export class RedisStore {
  private readonly namespace: string;
  private readonly entry: RedisPoolEntry;

  constructor(namespace: string, credentials?: RedisCredentials) {
    const value = namespace.trim();
    if (!value) throw new Error("[REDIS_STORE] namespace is required");
    this.namespace = value;

    const defaults = getRedisRuntimeDefaults();
    const creds = credentials ?? defaults.persistCredentials;

    if (!creds) {
      throw new Error("[REDIS_STORE] credentials are required. Pass constructor credentials or configureRedisRuntimeDefaults().");
    }

    this.entry = storePool.getOrCreateEntry(creds);
  }

  async listKeys(folder?: string) {
    await storePool.ensureConnected(this.entry, this.namespace);

    const currentFolder = (folder ?? "").trim();
    if (!currentFolder) {
      return this.entry.client.keys(`${this.namespace}*`);
    }

    const safeFolder = currentFolder.replace(/:+$/u, "");
    return this.entry.client.keys(`${this.namespace}:${safeFolder}:*`);
  }

  async listEntries(folder?: string) {
    await storePool.ensureConnected(this.entry, this.namespace);

    const keys = await this.listKeys(folder);
    if (keys.length === 0) return [];

    const values = await this.entry.client.mget(...keys);

    return keys.map((key, index) => ({
      key,
      value: values[index] ?? null,
    }));
  }

  key(...parts: string[]) {
    const safe = parts.filter((part) => part.trim().length > 0).map((part) => part.replace(/\s+/g, "_"));
    return [this.namespace, ...safe].join(":");
  }

  async state<T>(name: string, opts: { codec: Codec<T>; fallback?: () => T }) {
    await storePool.ensureConnected(this.entry, this.namespace);

    const key = this.key(name);
    const raw = await this.entry.client.get(key);

    if (!raw) return opts.fallback ? opts.fallback() : null;

    try {
      return opts.codec.decode(raw);
    } catch {
      return opts.fallback ? opts.fallback() : null;
    }
  }

  async save<T>(name: string, value: T, opts: { codec: Codec<T> }) {
    await storePool.ensureConnected(this.entry, this.namespace);

    const key = this.key(name);
    await this.entry.client.set(key, opts.codec.encode(value));
  }

  async delete(name: string) {
    await storePool.ensureConnected(this.entry, this.namespace);

    const key = this.key(name);
    return this.entry.client.del(key);
  }

  async patch<T>(
    name: string,
    opts: {
      codec: Codec<T>;
      fallback: () => T;
      mutate: (current: T) => void | T | Promise<void | T>;
      retries?: number;
    }
  ) {
    await storePool.ensureConnected(this.entry, this.namespace);

    const key = this.key(name);
    const retries = opts.retries ?? 15;

    for (let attempt = 0; attempt < retries; attempt += 1) {
      await this.entry.client.watch(key);

      const raw = await this.entry.client.get(key);
      let current: T;

      if (!raw) {
        current = opts.fallback();
      } else {
        try {
          current = opts.codec.decode(raw);
        } catch {
          current = opts.fallback();
        }
      }

      const output = await opts.mutate(current);
      const next = output === undefined ? current : output;

      const transaction = this.entry.client.multi();
      transaction.set(key, opts.codec.encode(next));

      const result = await transaction.exec();
      if (result) return next;

      await this.entry.client.unwatch();
    }

    await this.entry.client.unwatch();
    throw new Error(`[REDIS_STORE] patch failed after ${retries} retries: ${key}`);
  }
}

export async function assertRedisConnection(credentials: RedisCredentials, opts?: { timeoutMs?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 2500;

  const test = new Redis({
    ...credentials,
    lazyConnect: false,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    connectTimeout: timeoutMs,
    retryStrategy: () => null,
  });

  test.on("error", () => {
    // avoid unhandled error event noise
  });

  try {
    await test.ping();
  } catch (error: unknown) {
    try {
      test.disconnect();
    } catch {
      // no-op
    }
    throw error;
  }

  try {
    test.disconnect();
  } catch {
    // no-op
  }
}
