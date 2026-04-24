import { Router } from "express";
import { cacheController } from "../controllers/cache.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

// Read cache values (Date.now() is cached until TTL expires or reset route is called)
router.get("/read", asyncHandler(cacheController.read));

// Clear cache values
router.get("/reset", asyncHandler(cacheController.reset));

export const cacheRoutes = router;
