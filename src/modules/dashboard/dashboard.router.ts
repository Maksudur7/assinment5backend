import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import { getFavoritesController, getStatsController } from "./dashboard.controller";

const dashboardRouter = Router();

dashboardRouter.get("/stats", authenticate, asyncHandler(getStatsController));
dashboardRouter.get("/favorites", authenticate, asyncHandler(getFavoritesController));

export default dashboardRouter;
