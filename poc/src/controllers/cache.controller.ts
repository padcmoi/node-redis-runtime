import type { Request, Response } from "express";
import { agencyCache, geoCompletionCache, storageCache } from "../redis/cache.js";

async function read(req: Request<Record<string, string>, unknown, unknown, { agency?: string }>, res: Response) {
  const agencyKey = typeof req.query.agency === "string" && req.query.agency.trim() ? req.query.agency : "default_agency";

  const agencyByFixedKey = await agencyCache.getJsonCacheByKey(
    "getAllAgencyGroup",
    "code_123",
    () => Promise.resolve({ key: "code_123", generatedAt: Date.now() }),
    30
  );

  const agencyByQueryKey = await agencyCache.getJsonCacheByKey(
    "getAllAgencyGroup",
    agencyKey,
    () => Promise.resolve({ key: agencyKey, generatedAt: Date.now() }),
    30
  );

  const geoByKey = await geoCompletionCache.getJsonCacheByKey(
    "geoCompletion",
    "paris_fr",
    () => Promise.resolve({ city: "Paris", generatedAt: Date.now() }),
    20
  );

  const storageByKey = await storageCache.getJsonCacheByKey(
    "getBuckets",
    "demo_bucket",
    () => Promise.resolve({ bucket: "demo_bucket", generatedAt: Date.now() }),
    20
  );

  res.json({
    ok: true,
    cache: {
      agencyByFixedKey,
      agencyByQueryKey,
      geoByKey,
      storageByKey,
    },
  });
}

async function reset(_req: Request, res: Response) {
  await Promise.all([
    agencyCache.clearCaches("getAllAgencyGroup"),
    geoCompletionCache.clearCaches("geoCompletion"),
    storageCache.clearCaches("getBuckets"),
  ]);

  res.json({
    ok: true,
    reset: ["getAllAgencyGroup", "geoCompletion", "getBuckets"],
  });
}

export const cacheController = {
  read,
  reset,
};
