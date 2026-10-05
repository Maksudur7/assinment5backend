import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../middleware/auth";
import { strictRateLimit } from "../../middleware/rate-limit";
import { asyncHandler } from "../../utils/async-handler";
import { mediaIdParam, reviewIdParam, validate } from "../../utils/validate";
import {
  addCommentController,
  commentBody,
  createReviewBody,
  createReviewController,
  deleteReviewController,
  likeReviewController,
  listCommentsController,
  listReviewsController,
  listReviewsQuery,
  updateReviewBody,
  updateReviewController,
} from "./reviews.controller";

const reviewsRouter = Router();

// 30 write actions / minute / user (DB-backed, shared across instances)
const writeLimit = strictRateLimit({ scope: "review-write", windowMs: 60_000, max: 30 });

reviewsRouter.get(
  "/media/:mediaId/reviews",
  optionalAuthenticate,
  validate({ params: mediaIdParam, query: listReviewsQuery }),
  asyncHandler(listReviewsController),
);
reviewsRouter.post(
  "/media/:mediaId/reviews",
  authenticate,
  writeLimit,
  validate({ params: mediaIdParam, body: createReviewBody }),
  asyncHandler(createReviewController),
);
reviewsRouter.put(
  "/reviews/:reviewId",
  authenticate,
  writeLimit,
  validate({ params: reviewIdParam, body: updateReviewBody }),
  asyncHandler(updateReviewController),
);
reviewsRouter.delete(
  "/reviews/:reviewId",
  authenticate,
  writeLimit,
  validate({ params: reviewIdParam }),
  asyncHandler(deleteReviewController),
);
reviewsRouter.post(
  "/reviews/:reviewId/like",
  authenticate,
  writeLimit,
  validate({ params: reviewIdParam }),
  asyncHandler(likeReviewController),
);
reviewsRouter.post(
  "/reviews/:reviewId/comments",
  authenticate,
  writeLimit,
  validate({ params: reviewIdParam, body: commentBody }),
  asyncHandler(addCommentController),
);
reviewsRouter.get(
  "/reviews/:reviewId/comments",
  validate({ params: reviewIdParam }),
  asyncHandler(listCommentsController),
);

export default reviewsRouter;
