"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const async_handler_1 = require("../../utils/async-handler");
const media_controller_1 = require("./media.controller");
const mediaRouter = (0, express_1.Router)();
// ── Public endpoints ─────────────────────────────────────────────────────────
mediaRouter.get("/", (0, async_handler_1.asyncHandler)(media_controller_1.listMediaController));
mediaRouter.get("/search", (0, async_handler_1.asyncHandler)(media_controller_1.searchMediaController));
mediaRouter.get("/trending", (0, async_handler_1.asyncHandler)(media_controller_1.trendingController));
mediaRouter.get("/featured", (0, async_handler_1.asyncHandler)(media_controller_1.featuredController));
mediaRouter.get("/new-releases", (0, async_handler_1.asyncHandler)(media_controller_1.newReleasesController));
mediaRouter.get("/recommendations", auth_1.authenticate, (0, async_handler_1.asyncHandler)(media_controller_1.recommendationsController));
// ── Viewer tracking (public — sendBeacon needs no auth) ───────────────────
mediaRouter.post("/:id/increment-view", (0, async_handler_1.asyncHandler)(media_controller_1.incrementViewController));
mediaRouter.post("/:id/decrement-viewer", (0, async_handler_1.asyncHandler)(media_controller_1.decrementViewerController));
mediaRouter.get("/:id/view-stats", (0, async_handler_1.asyncHandler)(media_controller_1.getViewStatsController));
mediaRouter.get("/:id/viewers/stream", media_controller_1.streamViewerStatsController);
// ── Watch token (requires auth) ───────────────────────────────────────────
mediaRouter.get("/:id/watch-token", auth_1.authenticate, (0, async_handler_1.asyncHandler)(media_controller_1.watchTokenController));
// ── Single media ───────────────────────────────────────────────────────────
mediaRouter.get("/:id", (0, async_handler_1.asyncHandler)(media_controller_1.getMediaController));
// ── Admin only ─────────────────────────────────────────────────────────────
mediaRouter.post("/", auth_1.authenticate, auth_1.requireAdmin, (0, async_handler_1.asyncHandler)(media_controller_1.createMediaController));
mediaRouter.put("/:id", auth_1.authenticate, auth_1.requireAdmin, (0, async_handler_1.asyncHandler)(media_controller_1.updateMediaController));
mediaRouter.delete("/:id", auth_1.authenticate, auth_1.requireAdmin, (0, async_handler_1.asyncHandler)(media_controller_1.deleteMediaController));
exports.default = mediaRouter;
