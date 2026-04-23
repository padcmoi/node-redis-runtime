import type { CommonRedisOptions } from "ioredis";

export type Codec<T> = {
  encode: (value: T) => string;
  decode: (raw: string) => T;
};

export interface RedisCredentials extends CommonRedisOptions {
  host: string;
  port: number;
  username: string;
  password: string;
}

export type RedisRuntimeLogger = {
  info?: (message: string) => void;
  warn?: (message: string) => void;
  error?: (message: string) => void;
};

export type RequestLike = {
  baseUrl?: string;
  url?: string;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
};

export type RedisMultiLike = {
  set: (key: string, value: string) => RedisMultiLike;
  exec: () => Promise<ReadonlyArray<unknown> | null>;
};

export type RedisClientLike = {
  status: string;
  connect: () => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode?: "EX", ttl?: number) => Promise<unknown>;
  del: (...keys: string[]) => Promise<number>;
  mget: (...keys: string[]) => Promise<Array<string | null>>;
  keys: (pattern: string) => Promise<string[]>;
  watch: (key: string) => Promise<unknown>;
  multi: () => RedisMultiLike;
  unwatch: () => Promise<unknown>;
  ping: () => Promise<string>;
  disconnect: () => void;
  on: (event: "error", listener: (error: unknown) => void) => unknown;
};

export type RedisPoolEntry = {
  client: RedisClientLike;
  connectOnce: Promise<void> | null;
};

export type RedisClientFactory = (credentials: RedisCredentials) => RedisClientLike;

export type RedisStoreStateOptions<T> = {
  codec: Codec<T>;
  fallback?: () => T;
};

export type RedisStorePatchOptions<T> = {
  codec: Codec<T>;
  fallback: () => T;
  mutate: (current: T) => void | T | Promise<void | T>;
  retries?: number;
};
