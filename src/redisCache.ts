import { RedisPool } from "./redisShared.js";
import { getRedisRuntimeDefaults } from "./runtimeDefaults.js";
import type { Codec, RedisCredentials, RedisPoolEntry, RedisRuntimeLogger, RequestLike } from "./types.js";

const cachePool = new RedisPool("REDIS_CACHE");

function resolveLogger(local?: RedisRuntimeLogger) {
  return local ?? getRedisRuntimeDefaults().logger ?? {};
}

export class RedisCache {
  private static readonly defaultJsonCodec: Codec<unknown> = {
    encode: (value) => JSON.stringify(value),
    decode: (raw) => JSON.parse(raw) as unknown,
  };

  private readonly namespace: string;
  private readonly entry: RedisPoolEntry;
  private readonly defaultTtl: number;
  private readonly ttlMax: number;
  private readonly logger?: RedisRuntimeLogger;

  constructor(
    namespace: string,
    opts?: {
      credentials?: RedisCredentials;
      defaultTtl?: number;
      ttlMax?: number;
      logger?: RedisRuntimeLogger;
    }
  ) {
    const value = namespace.trim();
    if (!value) throw new Error("[REDIS_CACHE] namespace is required");
    this.namespace = value;

    this.logger = opts?.logger;

    const defaults = getRedisRuntimeDefaults();
    const credentials = opts?.credentials ?? defaults.cacheCredentials;

    if (!credentials) {
      throw new Error("[REDIS_CACHE] credentials are required. Use opts.credentials or configureRedisRuntimeDefaults().");
    }

    this.entry = cachePool.getOrCreateEntry(credentials);

    this.defaultTtl = opts?.defaultTtl ?? 300;
    this.ttlMax = opts?.ttlMax ?? 300;

    const explicitDefaultTtl = opts?.defaultTtl;
    const ttlMaxAuto = opts?.ttlMax === undefined && explicitDefaultTtl !== undefined && explicitDefaultTtl > 300;
    if (ttlMaxAuto) this.ttlMax = explicitDefaultTtl + 5;

    if (this.defaultTtl <= 0) throw new Error("[REDIS_CACHE] defaultTtl must be > 0");
    if (this.ttlMax <= 0) throw new Error("[REDIS_CACHE] ttlMax must be > 0");
    if (this.defaultTtl > this.ttlMax) throw new Error("[REDIS_CACHE] defaultTtl cannot exceed ttlMax");
  }

  key(...parts: string[]) {
    const safe = parts.filter((part) => part.trim().length > 0).map((part) => part.replace(/\s+/g, "_"));
    return [this.namespace, ...safe].join(":");
  }

  private assertTtl(ttl: number) {
    if (!Number.isFinite(ttl) || ttl <= 0) {
      throw new Error("[REDIS_CACHE] ttl must be a positive number");
    }

    if (ttl > this.ttlMax) {
      throw new Error(`[REDIS_CACHE] ttl must be <= ${this.ttlMax}s`);
    }
  }

  private getCodec<T>(codec?: Codec<T>) {
    return codec ?? (RedisCache.defaultJsonCodec as Codec<T>);
  }

  async get<T>(name: string, opts?: { codec?: Codec<T> }) {
    await cachePool.ensureConnected(this.entry, this.namespace);

    const key = this.key(name);
    const raw = await this.entry.client.get(key);
    if (!raw) return null;

    const codec = this.getCodec(opts?.codec);

    try {
      return codec.decode(raw);
    } catch {
      return null;
    }
  }

  async set<T>(name: string, value: T, opts?: { codec?: Codec<T>; ttl?: number }) {
    await cachePool.ensureConnected(this.entry, this.namespace);

    const ttl = opts?.ttl ?? this.defaultTtl;
    this.assertTtl(ttl);

    const codec = this.getCodec(opts?.codec);

    const key = this.key(name);
    await this.entry.client.set(key, codec.encode(value), "EX", ttl);
  }

  async setJsonNow<T>(name: string, value: T, ttl?: number) {
    const currentTtl = ttl ?? this.defaultTtl;

    try {
      await this.set(name, value, { ttl: currentTtl });
    } catch {
      // best-effort shortcut
    }
  }

  async getJsonNow<T>(name: string) {
    return this.get<T>(name);
  }

  async del(name: string) {
    await cachePool.ensureConnected(this.entry, this.namespace);
    await this.entry.client.del(this.key(name));
  }

  private async setBestEffort<T>(name: string, value: T, opts: { codec?: Codec<T>; ttl?: number }) {
    try {
      await this.set(name, value, opts);
      const ttl = opts.ttl ?? this.defaultTtl;
      resolveLogger(this.logger).info?.(`[REDIS_CACHE] cached namespace=${this.namespace} key=${name} ttl=${ttl}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("OOM") || message.includes("maxmemory") || message.includes("evict") || message.includes("memory")) {
        resolveLogger(this.logger).warn?.(
          `[REDIS_CACHE] write skipped (pressure) namespace=${this.namespace} key=${name} message=${message}`
        );
        return;
      }

      resolveLogger(this.logger).warn?.(`[REDIS_CACHE] write skipped namespace=${this.namespace} key=${name} message=${message}`);
    }
  }

  async getCacheIfExists<T>(
    name: string,
    opts: {
      ttl?: number;
      compute: () => Promise<T>;
      codec?: Codec<T>;
      cacheNull?: boolean;
    }
  ) {
    const cached = await this.get<T>(name, { codec: opts.codec });
    if (cached !== null) return cached;

    const value = await opts.compute();

    if (value === null || value === undefined) {
      if (opts.cacheNull) {
        await this.setBestEffort(name, value, { codec: opts.codec, ttl: opts.ttl });
      }
      return value;
    }

    await this.setBestEffort(name, value, { codec: opts.codec, ttl: opts.ttl });
    return value;
  }

  async getJsonCacheIfExists<T>(name: string, compute: () => Promise<T>, ttl?: number) {
    return this.getCacheIfExists(name, { compute, ttl });
  }

  async getJsonCacheByReq<T>(name: string, req: RequestLike, compute: () => Promise<T>, ttl?: number) {
    const variant = cachePool.buildVariantFromParamsQuery(req);
    return this.getJsonCacheIfExists(`${name}:${variant}`, compute, ttl);
  }

  async getJsonCacheByKey<T>(name: string, key: string, compute: () => Promise<T>, ttl?: number) {
    return this.getJsonCacheIfExists(`${name}:{KEY}:${cachePool.buildVariantFromName(key)}`, compute, ttl);
  }

  async clearCaches(...names: string[]) {
    await cachePool.ensureConnected(this.entry, this.namespace);
    if (names.length === 0) return;

    const keys = (
      await Promise.all(
        names.map(async (name) => {
          const root = this.key(name);
          const variants = await this.entry.client.keys(this.key(`${name}:*`));
          return [root, ...variants];
        })
      )
    ).flat();

    if (keys.length === 0) return;
    await this.entry.client.del(...keys);
  }
}
