import { RedisStore, assertRedisConnection } from "./RedisStore.js";
import { RedisCache } from "./redisCache.js";
import { configureRedisRuntimeDefaults } from "./runtimeDefaults.js";
import type { RedisClientFactory, RedisCredentials, RedisRuntimeLogger } from "./types.js";

export type RedisRuntimeServiceOptions = {
  persistCredentials: RedisCredentials;
  cacheCredentials: RedisCredentials;
  logger?: RedisRuntimeLogger;
  createClient?: RedisClientFactory;
};

export class RedisRuntimeService {
  private readonly persistCredentials: RedisCredentials;
  private readonly cacheCredentials: RedisCredentials;
  private readonly logger?: RedisRuntimeLogger;
  private readonly createClient?: RedisClientFactory;

  constructor(options: RedisRuntimeServiceOptions) {
    this.persistCredentials = options.persistCredentials;
    this.cacheCredentials = options.cacheCredentials;
    this.logger = options.logger;
    this.createClient = options.createClient;
  }

  configureDefaults() {
    configureRedisRuntimeDefaults({
      persistCredentials: this.persistCredentials,
      cacheCredentials: this.cacheCredentials,
      logger: this.logger,
      createClient: this.createClient,
    });
    return this;
  }

  store(namespace: string, credentials?: RedisCredentials) {
    return new RedisStore(namespace, credentials ?? this.persistCredentials);
  }

  cache(
    namespace: string,
    opts?: {
      credentials?: RedisCredentials;
      defaultTtl?: number;
      ttlMax?: number;
      logger?: RedisRuntimeLogger;
    }
  ) {
    return new RedisCache(namespace, {
      credentials: opts?.credentials ?? this.cacheCredentials,
      defaultTtl: opts?.defaultTtl,
      ttlMax: opts?.ttlMax,
      logger: opts?.logger ?? this.logger,
    });
  }

  async assertPersistConnection(opts?: { timeoutMs?: number }) {
    await assertRedisConnection(this.persistCredentials, opts);
  }

  async assertCacheConnection(opts?: { timeoutMs?: number }) {
    await assertRedisConnection(this.cacheCredentials, opts);
  }
}

export function createRedisRuntimeService(options: RedisRuntimeServiceOptions) {
  const service = new RedisRuntimeService(options);
  service.configureDefaults();
  return service;
}
