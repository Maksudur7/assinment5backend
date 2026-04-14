import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import {
  addReviewComment,
  createReview,
  deleteReview,
  listReviewComments,
  listReviews,
  toggleReviewLike,
  updateReview,
} from "./reviews.service";

export async function listReviewsController(req: Request, res: Response) {
  const limit = Number.parseInt(String(req.query.limit || 10), 10);
  const offset = Number.parseInt(String(req.query.offset || 0), 10);
  const includePending = String(req.query.includePending || "false") === "true";
  const data = await listReviews(String(req.params.mediaId), limit, offset, includePending);
  return res.status(200).json(data);
}

export async function createReviewController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const { rating, content, tags = [], spoiler = false } = req.body || {};
  if (!rating || !content) throw new AppError("rating and content required", 422, "VALIDATION_ERROR");
  const data = await createReview(String(req.params.mediaId), req.user.id, { rating, content, tags, spoiler });
  return res.status(201).json(data);
}

export async function updateReviewController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const data = await updateReview(String(req.params.reviewId), req.user.id, req.body || {});
  return res.status(200).json(data);
}

export async function deleteReviewController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const data = await deleteReview(String(req.params.reviewId), req.user.id);
  return res.status(200).json(data);
}

export async function likeReviewController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const data = await toggleReviewLike(String(req.params.reviewId), req.user.id);
  return res.status(200).json(data);
}

export async function addCommentController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const { content, parentCommentId = null } = req.body || {};
  if (!content) throw new AppError("content required", 422, "VALIDATION_ERROR");
  const data = await addReviewComment(String(req.params.reviewId), req.user.id, content, parentCommentId);
  return res.status(201).json(data);
}

export async function listCommentsController(req: Request, res: Response) {
  const data = await listReviewComments(String(req.params.reviewId));
  return res.status(200).json(data);
}
