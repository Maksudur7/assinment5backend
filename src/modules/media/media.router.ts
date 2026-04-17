import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
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
} from "./media.controller";

const mediaRouter = Router();

mediaRouter.get("/", asyncHandler(listMediaController));
mediaRouter.get("/trending", asyncHandler(trendingController));
mediaRouter.get("/featured", asyncHandler(featuredController));
mediaRouter.get("/new-releases", asyncHandler(newReleasesController));
mediaRouter.get("/recommendations", authenticate, asyncHandler(recommendationsController));
mediaRouter.get("/:id", asyncHandler(getMediaController));
mediaRouter.put("/:id", authenticate, requireAdmin, asyncHandler(updateMediaController));
mediaRouter.delete("/:id", authenticate, requireAdmin, asyncHandler(deleteMediaController));
// Real-time view/user count endpoints
mediaRouter.post("/:id/increment-view", asyncHandler(incrementViewController));
mediaRouter.post("/:id/decrement-viewer", asyncHandler(decrementViewerController));
mediaRouter.get("/:id/view-stats", asyncHandler(getViewStatsController));

export default mediaRouter;
