import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
	adminOverviewController,
	approveReviewController,
	createMediaController,
	pendingReviewsController,
	rejectReviewController,
} from "./admin.controller";

const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/overview", asyncHandler(adminOverviewController));
adminRouter.get("/reviews/pending", asyncHandler(pendingReviewsController));
adminRouter.post("/reviews/:reviewId/approve", asyncHandler(approveReviewController));
adminRouter.post("/reviews/:reviewId/reject", asyncHandler(rejectReviewController));
adminRouter.post("/media", asyncHandler(createMediaController));

export default adminRouter;
