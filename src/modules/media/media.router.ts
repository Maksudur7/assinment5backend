import { Router } from "express";
import { authenticate, optionalAuthenticate, requireAdmin } from "../../middleware/auth";
import { strictRateLimit } from "../../middleware/rate-limit";
import { asyncHandler } from "../../utils/async-handler";
import { idParam, mediaBody, mediaUpdateBody, validate } from "../../utils/validate";
import { limitQuery, listMediaQuery, searchQuery } from "./media.schema";
import {
  createMediaController,
  deleteMediaController,
  featuredController,
  getMediaController,
  getViewStatsController,
  heartbeatController,
  leaveController,
  listMediaController,
  newReleasesController,
  recommendationsController,
  searchMediaController,
  trendingController,
  updateMediaController,
  searchTMDBController,
  importTMDBController,
  autoSyncTMDBController,
} from "./media.controller";

const mediaRouter = Router();

// ── Public listings (streamingUrl is stripped unless signed-in) ─────────────
mediaRouter.get("/", optionalAuthenticate, validate({ query: listMediaQuery }), asyncHandler(listMediaController));
mediaRouter.get("/search", optionalAuthenticate, validate({ query: searchQuery }), asyncHandler(searchMediaController));
mediaRouter.get("/trending", optionalAuthenticate, validate({ query: limitQuery }), asyncHandler(trendingController));
mediaRouter.get("/featured", optionalAuthenticate, asyncHandler(featuredController));
mediaRouter.get("/new-releases", optionalAuthenticate, validate({ query: limitQuery }), asyncHandler(newReleasesController));
mediaRouter.get("/recommendations", authenticate, asyncHandler(recommendationsController));

// ── TMDB Import & Auto-Sync (Admin Only) ────────────────────────────────────
mediaRouter.get("/tmdb/search", authenticate, requireAdmin, asyncHandler(searchTMDBController));
mediaRouter.post("/tmdb/import", authenticate, requireAdmin, asyncHandler(importTMDBController));
mediaRouter.post("/tmdb/auto-sync", authenticate, requireAdmin, asyncHandler(autoSyncTMDBController));

// ── Viewer presence (heartbeat) ─────────────────────────────────────────────
const presenceLimit = strictRateLimit({
  scope: "presence",
  windowMs: 60_000,
  max: 30,
  keyBy: (req) => `${req.ip}:${req.params.id}`,
});
mediaRouter.post("/:id/heartbeat", optionalAuthenticate, presenceLimit, validate({ params: idParam }), asyncHandler(heartbeatController));
// Backwards-compatible aliases for older clients / sendBeacon
mediaRouter.post("/:id/increment-view", optionalAuthenticate, presenceLimit, validate({ params: idParam }), asyncHandler(heartbeatController));
mediaRouter.post("/:id/decrement-viewer", optionalAuthenticate, presenceLimit, validate({ params: idParam }), asyncHandler(leaveController));
mediaRouter.get("/:id/view-stats", validate({ params: idParam }), asyncHandler(getViewStatsController));

// ── Single media ────────────────────────────────────────────────────────────
mediaRouter.get("/:id", optionalAuthenticate, validate({ params: idParam }), asyncHandler(getMediaController));

// ── Admin only ──────────────────────────────────────────────────────────────
mediaRouter.post("/", authenticate, requireAdmin, validate({ body: mediaBody }), asyncHandler(createMediaController));
mediaRouter.put("/:id", authenticate, requireAdmin, validate({ params: idParam, body: mediaUpdateBody }), asyncHandler(updateMediaController));
mediaRouter.delete("/:id", authenticate, requireAdmin, validate({ params: idParam }), asyncHandler(deleteMediaController));

export default mediaRouter;
