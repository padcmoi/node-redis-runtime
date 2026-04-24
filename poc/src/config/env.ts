export const POC_PORT = Number(process.env.PORT ?? 3000);

export const POC_REDIS_PERSIST_HOST = process.env.REDIS_PERSIST_HOST ?? "localhost";
export const POC_REDIS_PERSIST_PORT = Number(process.env.REDIS_PERSIST_PORT ?? 6379);
export const POC_REDIS_PERSIST_USER = process.env.REDIS_PERSIST_USER ?? "user";
export const POC_REDIS_PERSIST_PASSWORD = process.env.REDIS_PERSIST_PASSWORD ?? "password";

export const POC_REDIS_CACHE_HOST = process.env.REDIS_CACHE_HOST ?? "localhost";
export const POC_REDIS_CACHE_PORT = Number(process.env.REDIS_CACHE_PORT ?? 6380);
export const POC_REDIS_CACHE_USER = process.env.REDIS_CACHE_USER ?? "user";
export const POC_REDIS_CACHE_PASSWORD = process.env.REDIS_CACHE_PASSWORD ?? "password";

export const POC_CACHE_DEFAULT_TTL = Number(process.env.POC_CACHE_DEFAULT_TTL ?? 10);
export const POC_CACHE_TTL_MAX = Number(process.env.POC_CACHE_TTL_MAX ?? 60);
