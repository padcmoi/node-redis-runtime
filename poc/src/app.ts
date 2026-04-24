import express, { type NextFunction, type Request, type Response } from "express";
import { pocRoutes } from "./routes/index.js";

export function createPocApp() {
  const app = express();
  app.use(express.json());

  app.use(pocRoutes);

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(500).json({ ok: false, error: message });
  });

  return app;
}
