import { Router } from "express";
import { healthController } from "../controllers/health.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.get("/", asyncHandler(healthController.get));

export const healthRoutes = router;
