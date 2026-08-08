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
adminRouter.post("/reviews/:reviewId/unpublish", asyncHandler(rejectReviewController));
adminRouter.delete("/reviews/:reviewId", asyncHandler(async (req, res) => {
  const { default: prisma } = await import("../../lib/prisma.js");
  await (prisma as any).review.delete({ where: { id: req.params.reviewId } });
  return res.status(200).json({ success: true });
}));
adminRouter.post("/comments/:commentId/approve", asyncHandler(approveCommentController));
adminRouter.post("/comments/:commentId/unpublish", asyncHandler(rejectCommentController));
adminRouter.delete("/comments/:commentId", asyncHandler(removeCommentController));
adminRouter.post("/categories", asyncHandler(createCategoryController));
adminRouter.delete("/categories/:id", asyncHandler(deleteCategoryController));
adminRouter.post("/media", asyncHandler(createMediaController));

// User Management Routes
adminRouter.get("/users", asyncHandler(async (req, res, next) => {
  const { listUsersController } = await import("./admin.controller.js");
  return listUsersController(req, res);
}));
adminRouter.patch("/users/:userId/role", asyncHandler(async (req, res, next) => {
  const { updateUserRoleController } = await import("./admin.controller.js");
  return updateUserRoleController(req, res);
}));

export default adminRouter;
