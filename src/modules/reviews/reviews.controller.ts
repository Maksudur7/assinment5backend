import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/errors";
import { pagination } from "../../utils/validate";
import {
  addReviewComment,
  createReview,
  deleteReview,
  listReviewComments,
  listReviews,
  toggleReviewLike,
  updateReview,
} from "./reviews.service";

const tags = z.array(z.string().trim().min(1).max(30)).max(10);

export const listReviewsQuery = z.object({
  ...pagination(10, 50),
  includePending: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export const createReviewBody = z.object({
  rating: z.coerce.number().int().min(1).max(10),
  content: z.string().trim().min(1).max(5000),
  tags: tags.default([]),
  spoiler: z.boolean().default(false),
});

export const updateReviewBody = z
  .object({
    rating: z.coerce.number().int().min(1).max(10).optional(),
    content: z.string().trim().min(1).max(5000).optional(),
    tags: tags.optional(),
    spoiler: z.boolean().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "Nothing to update" });

export const commentBody = z.object({
  content: z.string().trim().min(1).max(2000),
  parentCommentId: z.string().min(1).max(100).nullish().transform((v) => v ?? null),
});

function requireUser(req: Request) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  return req.user;
}

export async function listReviewsController(req: Request, res: Response) {
  const q = req.validatedQuery as { limit: number; offset: number; includePending: boolean };
  const data = await listReviews(req.params.mediaId as string, q.limit, q.offset, q.includePending, req.user);
  return res.status(200).json(data);
}

export async function createReviewController(req: Request, res: Response) {
  const user = requireUser(req);
  const data = await createReview(req.params.mediaId as string, user.id, req.body);
  return res.status(201).json(data);
}

export async function updateReviewController(req: Request, res: Response) {
  const user = requireUser(req);
  return res.status(200).json(await updateReview(req.params.reviewId as string, user.id, req.body));
}

export async function deleteReviewController(req: Request, res: Response) {
  const user = requireUser(req);
  return res.status(200).json(await deleteReview(req.params.reviewId as string, user.id));
}

export async function likeReviewController(req: Request, res: Response) {
  const user = requireUser(req);
  return res.status(200).json(await toggleReviewLike(req.params.reviewId as string, user.id));
}

export async function addCommentController(req: Request, res: Response) {
  const user = requireUser(req);
  const { content, parentCommentId } = req.body;
  return res.status(201).json(await addReviewComment(req.params.reviewId as string, user.id, content, parentCommentId));
}

export async function listCommentsController(req: Request, res: Response) {
  return res.status(200).json(await listReviewComments(req.params.reviewId as string));
}
