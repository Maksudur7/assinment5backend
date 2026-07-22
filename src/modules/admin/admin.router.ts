import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
	adminOverviewController,
	approveReviewController,
	createMediaController,
	pendingReviewsController,
	pendingCommentsController,
	rejectReviewController,
	approveCommentController,
	rejectCommentController,
	removeCommentController,
	createCategoryController,
	deleteCategoryController,
} from "./admin.controller";

const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/overview", asyncHandler(adminOverviewController));
adminRouter.get("/reviews/pending", asyncHandler(pendingReviewsController));
adminRouter.get("/comments/pending", asyncHandler(pendingCommentsController));
adminRouter.post("/reviews/:reviewId/approve", asyncHandler(approveReviewController));
adminRouter.post("/reviews/:reviewId/reject", asyncHandler(rejectReviewController));
adminRouter.post("/comments/:commentId/approve", asyncHandler(approveCommentController));
adminRouter.post("/comments/:commentId/unpublish", asyncHandler(rejectCommentController));
adminRouter.delete("/comments/:commentId", asyncHandler(removeCommentController));
adminRouter.post("/categories", asyncHandler(createCategoryController));
adminRouter.delete("/categories/:id", asyncHandler(deleteCategoryController));
adminRouter.post("/media", asyncHandler(createMediaController));

export default adminRouter;
