import type { RedisClientFactory, RedisCredentials, RedisRuntimeLogger } from "./types.js";

type RedisRuntimeDefaults = {
  cacheCredentials: RedisCredentials | null;
  persistCredentials: RedisCredentials | null;
  logger: RedisRuntimeLogger | null;
  createClient: RedisClientFactory | null;
};

const defaults: RedisRuntimeDefaults = {
  cacheCredentials: null,
  persistCredentials: null,
  logger: null,
  createClient: null,
};

export function configureRedisRuntimeDefaults(input: {
  cacheCredentials?: RedisCredentials;
  persistCredentials?: RedisCredentials;
  logger?: RedisRuntimeLogger;
  createClient?: RedisClientFactory;
}) {
  if (input.cacheCredentials) defaults.cacheCredentials = input.cacheCredentials;
  if (input.persistCredentials) defaults.persistCredentials = input.persistCredentials;
  if (input.logger) defaults.logger = input.logger;
  if (input.createClient) defaults.createClient = input.createClient;
}

export function getRedisRuntimeDefaults() {
  return defaults;
}

export function resetRedisRuntimeDefaults() {
  defaults.cacheCredentials = null;
  defaults.persistCredentials = null;
  defaults.logger = null;
  defaults.createClient = null;
}
