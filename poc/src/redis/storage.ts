import { jsonCodec } from "@naskot/node-redis-runtime";
import { RedisStore } from "../services/redis.service.js";

export const pocStorage = new RedisStore("POC_PERSIST");
export const pocJsonCodec = jsonCodec<unknown>();
