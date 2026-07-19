import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
  createMediaController,
  deleteMediaController,
  featuredController,
  getMediaController,
  listMediaController,
  newReleasesController,
  recommendationsController,
  trendingController,
  updateMediaController,
  incrementViewController,
  decrementViewerController,
  getViewStatsController,
  streamViewerStatsController,
  searchMediaController,
  watchTokenController,
} from "./media.controller";

const mediaRouter = Router();

// ── Public endpoints ─────────────────────────────────────────────────────────
mediaRouter.get("/", asyncHandler(listMediaController));
mediaRouter.get("/search", asyncHandler(searchMediaController));
mediaRouter.get("/trending", asyncHandler(trendingController));
mediaRouter.get("/featured", asyncHandler(featuredController));
mediaRouter.get("/new-releases", asyncHandler(newReleasesController));
mediaRouter.get("/recommendations", authenticate, asyncHandler(recommendationsController));

// ── Viewer tracking (public — sendBeacon needs no auth) ───────────────────
mediaRouter.post("/:id/increment-view", asyncHandler(incrementViewController));
mediaRouter.post("/:id/decrement-viewer", asyncHandler(decrementViewerController));
mediaRouter.get("/:id/view-stats", asyncHandler(getViewStatsController));
mediaRouter.get("/:id/viewers/stream", streamViewerStatsController);

// ── Watch token (requires auth) ───────────────────────────────────────────
mediaRouter.get("/:id/watch-token", authenticate, asyncHandler(watchTokenController));

// ── Single media ───────────────────────────────────────────────────────────
mediaRouter.get("/:id", asyncHandler(getMediaController));

// ── Admin only ─────────────────────────────────────────────────────────────
mediaRouter.post("/", authenticate, requireAdmin, asyncHandler(createMediaController));
mediaRouter.put("/:id", authenticate, requireAdmin, asyncHandler(updateMediaController));
mediaRouter.delete("/:id", authenticate, requireAdmin, asyncHandler(deleteMediaController));

export default mediaRouter;
