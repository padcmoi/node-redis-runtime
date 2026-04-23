import { Router } from "express";
import { cacheRoutes } from "./cache.routes.js";
import { healthRoutes } from "./health.routes.js";
import { persistRoutes } from "./persist.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/persist", persistRoutes);
router.use("/cache", cacheRoutes);

export const pocRoutes = router;
