import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
  commentIdParam,
  idParam,
  mediaBody,
  reviewIdParam,
  userIdParam,
  validate,
} from "../../utils/validate";
import {
  adminOverviewController,
  approveCommentController,
  approveReviewController,
  categoryBody,
  createCategoryController,
  createMediaController,
  deleteCategoryController,
  listUsersController,
  pendingCommentsController,
  pendingReviewsController,
  rejectCommentController,
  rejectReviewController,
  removeCommentController,
  removeReviewController,
  roleBody,
  updateUserRoleController,
} from "./admin.controller";

const adminRouter = Router();

adminRouter.use(authenticate, requireAdmin);

adminRouter.get("/overview", asyncHandler(adminOverviewController));
adminRouter.get("/reviews/pending", asyncHandler(pendingReviewsController));
adminRouter.get("/comments/pending", asyncHandler(pendingCommentsController));

adminRouter.post("/reviews/:reviewId/approve", validate({ params: reviewIdParam }), asyncHandler(approveReviewController));
adminRouter.post("/reviews/:reviewId/reject", validate({ params: reviewIdParam }), asyncHandler(rejectReviewController));
adminRouter.post("/reviews/:reviewId/unpublish", validate({ params: reviewIdParam }), asyncHandler(rejectReviewController));
adminRouter.delete("/reviews/:reviewId", validate({ params: reviewIdParam }), asyncHandler(removeReviewController));

adminRouter.post("/comments/:commentId/approve", validate({ params: commentIdParam }), asyncHandler(approveCommentController));
adminRouter.post("/comments/:commentId/unpublish", validate({ params: commentIdParam }), asyncHandler(rejectCommentController));
adminRouter.delete("/comments/:commentId", validate({ params: commentIdParam }), asyncHandler(removeCommentController));

adminRouter.post("/categories", validate({ body: categoryBody }), asyncHandler(createCategoryController));
adminRouter.delete("/categories/:id", validate({ params: idParam }), asyncHandler(deleteCategoryController));
adminRouter.post("/media", validate({ body: mediaBody }), asyncHandler(createMediaController));

adminRouter.get("/users", asyncHandler(listUsersController));
adminRouter.patch("/users/:userId/role", validate({ params: userIdParam, body: roleBody }), asyncHandler(updateUserRoleController));

export default adminRouter;
