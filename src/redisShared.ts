import { Redis } from "ioredis";
import { createHash } from "node:crypto";
import { jsonCodec, textCodec } from "./codecs.js";
import { getRedisRuntimeDefaults } from "./runtimeDefaults.js";
import type {
  RedisClientFactory,
  RedisClientLike,
  RedisCredentials,
  RedisPoolEntry,
  RedisRuntimeLogger,
  RequestLike,
} from "./types.js";
import { toSnakeCase } from "./utils.js";

export type { Codec, RedisCredentials, RedisPoolEntry, RedisRuntimeLogger, RequestLike } from "./types.js";
export { jsonCodec, textCodec };

type RedisPoolOptions = {
  logger?: RedisRuntimeLogger;
  createClient?: RedisClientFactory;
};

function selectLogger(fallback?: RedisRuntimeLogger) {
  const defaults = getRedisRuntimeDefaults();
  return fallback ?? defaults.logger ?? {};
}

export class RedisPool {
  private readonly pool = new Map<string, RedisPoolEntry>();
  private readonly prefix: string;
  private readonly logger?: RedisRuntimeLogger;
  private readonly createClient?: RedisClientFactory;

  constructor(prefix: string, opts?: RedisPoolOptions) {
    this.prefix = prefix;
    this.logger = opts?.logger;
    this.createClient = opts?.createClient;
  }

  private poolKey(credentials: RedisCredentials) {
    return `${credentials.host}:${credentials.port}:${credentials.username ?? ""}:${credentials.password ?? ""}:${credentials.lazyConnect ? "1" : "0"}`;
  }

  getOrCreateEntry(credentials: RedisCredentials) {
    const key = this.poolKey(credentials);
    const existing = this.pool.get(key);
    if (existing) return existing;

    const defaults = getRedisRuntimeDefaults();
    const clientFactory =
      this.createClient ??
      defaults.createClient ??
      ((inputCredentials: RedisCredentials) => {
        return new Redis(inputCredentials) as unknown as RedisClientLike;
      });

    const client = clientFactory(credentials);
    client.on("error", () => {
      // avoid unhandled redis error events
    });

    const entry: RedisPoolEntry = {
      client,
      connectOnce: null,
    };

    this.pool.set(key, entry);
    return entry;
  }

  async ensureConnected(entry: RedisPoolEntry, label?: string) {
    if (entry.client.status === "ready") return;

    if (!entry.connectOnce) {
      entry.connectOnce = (async () => {
        await entry.client.connect();
        selectLogger(this.logger).info?.(`[${this.prefix}] ${label ?? ""} connected`);
      })().catch((error: unknown) => {
        entry.connectOnce = null;
        const message = error instanceof Error ? error.message : String(error);
        selectLogger(this.logger).error?.(`[${this.prefix}] ${label ?? ""} connect error: ${message}`);
        throw error;
      });
    }

    await entry.connectOnce;
  }

  buildVariantFromParamsQuery(req: RequestLike) {
    const params = req.params ?? {};
    const query = req.query ?? {};
    const url = req.url ?? "";

    const hash = createHash("md5").update(url).update(JSON.stringify(params)).update(JSON.stringify(query)).digest("hex");

    const base = toSnakeCase(req.baseUrl ?? "");
    return `${base}_${hash}`;
  }

  buildVariantFromName(name: string) {
    return createHash("md5").update(name).digest("hex");
  }
}
