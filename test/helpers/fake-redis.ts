import type { RedisClientFactory, RedisClientLike, RedisCredentials, RedisMultiLike } from "../../src/types.js";

type StoredValue = {
  value: string;
  expiresAt: number | null;
};

function nowMs() {
  return Date.now();
}

function keyFromCredentials(credentials: RedisCredentials) {
  return `${credentials.host}:${credentials.port}:${credentials.username}:${credentials.password}`;
}

class FakeRedisClient implements RedisClientLike {
  status = "ready";

  private readonly values = new Map<string, StoredValue>();
  private readonly versions = new Map<string, number>();
  private readonly watchVersions = new Map<string, number>();
  private abortExecOnce = false;

  on(_event: "error", _listener: (error: unknown) => void) {
    return undefined;
  }

  connect() {
    this.status = "ready";
    return Promise.resolve();
  }

  ping() {
    return Promise.resolve("PONG");
  }

  disconnect() {
    this.status = "end";
  }

  failNextExec() {
    this.abortExecOnce = true;
  }

  private getVersion(key: string) {
    return this.versions.get(key) ?? 0;
  }

  private bumpVersion(key: string) {
    this.versions.set(key, this.getVersion(key) + 1);
  }

  private isExpired(value: StoredValue | undefined) {
    if (!value) return true;
    if (value.expiresAt === null) return false;
    return value.expiresAt <= nowMs();
  }

  private cleanupKey(key: string) {
    const value = this.values.get(key);
    if (!value) return;
    if (!this.isExpired(value)) return;

    this.values.delete(key);
    this.bumpVersion(key);
  }

  private writeKey(key: string, value: string, ttlSeconds?: number) {
    const expiresAt = typeof ttlSeconds === "number" ? nowMs() + ttlSeconds * 1000 : null;
    this.values.set(key, { value, expiresAt });
    this.bumpVersion(key);
  }

  get(key: string) {
    this.cleanupKey(key);
    const value = this.values.get(key);
    if (!value || this.isExpired(value)) {
      return Promise.resolve(null);
    }
    return Promise.resolve(value.value);
  }

  set(key: string, value: string, mode?: "EX", ttl?: number) {
    if (mode === "EX" && typeof ttl === "number") {
      this.writeKey(key, value, ttl);
      return Promise.resolve("OK");
    }

    this.writeKey(key, value);
    return Promise.resolve("OK");
  }

  del(...keys: string[]) {
    let deleted = 0;
    for (const key of keys) {
      this.cleanupKey(key);
      if (this.values.delete(key)) {
        deleted += 1;
        this.bumpVersion(key);
      }
    }
    return Promise.resolve(deleted);
  }

  async mget(...keys: string[]) {
    const values: Array<string | null> = [];
    for (const key of keys) {
      values.push(await this.get(key));
    }
    return values;
  }

  keys(pattern: string) {
    for (const key of this.values.keys()) {
      this.cleanupKey(key);
    }

    const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\*/g, ".*");
    const regex = new RegExp(`^${escaped}$`);

    return Promise.resolve([...this.values.keys()].filter((key) => regex.test(key)));
  }

  watch(key: string) {
    this.cleanupKey(key);
    this.watchVersions.set(key, this.getVersion(key));
    return Promise.resolve("OK");
  }

  multi() {
    const operations: Array<{ key: string; value: string }> = [];

    const transaction: RedisMultiLike = {
      set: (key, value) => {
        operations.push({ key, value });
        return transaction;
      },
      exec: () => {
        if (this.abortExecOnce) {
          this.abortExecOnce = false;
          this.watchVersions.clear();
          return Promise.resolve(null);
        }

        for (const [key, watchedVersion] of this.watchVersions.entries()) {
          this.cleanupKey(key);
          if (this.getVersion(key) !== watchedVersion) {
            this.watchVersions.clear();
            return Promise.resolve(null);
          }
        }

        for (const operation of operations) {
          this.writeKey(operation.key, operation.value);
        }

        this.watchVersions.clear();
        return Promise.resolve([]);
      },
    };

    return transaction;
  }

  unwatch() {
    this.watchVersions.clear();
    return Promise.resolve("OK");
  }
}

export function createFakeRedisClientFactory() {
  const clients = new Map<string, FakeRedisClient>();

  const createClient: RedisClientFactory = (credentials) => {
    const key = keyFromCredentials(credentials);
    const existing = clients.get(key);
    if (existing) return existing;

    const created = new FakeRedisClient();
    clients.set(key, created);
    return created;
  };

  function getClient(credentials: RedisCredentials) {
    const key = keyFromCredentials(credentials);
    const client = clients.get(key);
    if (!client) {
      throw new Error(`Missing fake redis client for credentials ${key}`);
    }
    return client;
  }

  return {
    createClient,
    getClient,
  };
}

let credentialCounter = 0;

export function createTestCredentials(prefix: string) {
  credentialCounter += 1;
  return {
    host: `${prefix}-${credentialCounter}.local`,
    port: 6379,
    username: "user",
    password: "password",
    lazyConnect: true,
    maxRetriesPerRequest: null,
  } satisfies RedisCredentials;
}
