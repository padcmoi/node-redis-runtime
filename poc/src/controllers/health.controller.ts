import type { Request, Response } from "express";
import { agencyCache } from "../redis/cache.js";

async function get(_req: Request, res: Response) {
  const cachePing = await agencyCache.getJsonNow<{ ok: boolean }>("_health_ping");
  res.json({ ok: true, cachePing: cachePing ?? null });
}

export const healthController = {
  get,
};
