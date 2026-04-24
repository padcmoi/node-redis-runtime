import type { Request, Response } from "express";
import { pocJsonCodec, pocStorage } from "../redis/storage.js";
import { normalizeKey } from "../utils/key.js";

async function upsert(req: Request, res: Response) {
  const key = normalizeKey(req.params["key"]);
  if (!key) {
    res.status(400).json({ ok: false, error: "key is required" });
    return;
  }

  const payload = (req.body as unknown) ?? null;
  await pocStorage.save(`entries:${key}`, payload, { codec: pocJsonCodec });
  res.json({ ok: true, key, stored: payload });
}

async function getOne(req: Request, res: Response) {
  const key = normalizeKey(req.params["key"]);
  if (!key) {
    res.status(400).json({ ok: false, error: "key is required" });
    return;
  }

  const value = await pocStorage.state<unknown>(`entries:${key}`, { codec: pocJsonCodec });
  res.json({ ok: true, key, value });
}

async function list(_req: Request, res: Response) {
  const entries = await pocStorage.listEntries("entries");
  res.json({ ok: true, entries });
}

export const persistController = {
  upsert,
  getOne,
  list,
};
