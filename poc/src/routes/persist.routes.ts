import { Router } from "express";
import { persistController } from "../controllers/persist.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();

router.post("/:key", asyncHandler(persistController.upsert));
router.get("/:key", asyncHandler(persistController.getOne));
router.get("/", asyncHandler(persistController.list));

export const persistRoutes = router;
