import type { Codec } from "./types.js";

export function jsonCodec<T>() {
  return {
    encode: (value: T) => JSON.stringify(value),
    decode: (raw: string) => JSON.parse(raw) as T,
  } satisfies Codec<T>;
}

export const textCodec: Codec<string> = {
  encode: (value) => value,
  decode: (raw) => raw,
};
