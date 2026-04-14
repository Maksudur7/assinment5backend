import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
  addCommentController,
  createReviewController,
  deleteReviewController,
  likeReviewController,
  listCommentsController,
  listReviewsController,
  updateReviewController,
} from "./reviews.controller";

const reviewsRouter = Router();

reviewsRouter.get("/media/:mediaId/reviews", asyncHandler(listReviewsController));
reviewsRouter.post("/media/:mediaId/reviews", authenticate, asyncHandler(createReviewController));
reviewsRouter.put("/reviews/:reviewId", authenticate, asyncHandler(updateReviewController));
reviewsRouter.delete("/reviews/:reviewId", authenticate, asyncHandler(deleteReviewController));
reviewsRouter.post("/reviews/:reviewId/like", authenticate, asyncHandler(likeReviewController));
reviewsRouter.post("/reviews/:reviewId/comments", authenticate, asyncHandler(addCommentController));
reviewsRouter.get("/reviews/:reviewId/comments", asyncHandler(listCommentsController));

export default reviewsRouter;
