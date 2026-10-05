import { UserRole } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import {
  approveComment,
  approveReview,
  createCategory,
  createMedia,
  deleteCategory,
  getAdminOverview,
  listAllUsers,
  listPendingComments,
  listPendingReviews,
  rejectComment,
  rejectReview,
  removeComment,
  removeReview,
  updateUserRole,
} from "./admin.service";

export const categoryBody = z.object({
  name: z.string().trim().min(1).max(50),
  icon: z.string().trim().min(1).max(50).optional(),
});

export const roleBody = z.object({
  role: z.nativeEnum(UserRole),
});

export async function pendingCommentsController(_req: Request, res: Response) {
  return res.status(200).json(await listPendingComments());
}

export async function adminOverviewController(_req: Request, res: Response) {
  return res.status(200).json(await getAdminOverview());
}

export async function pendingReviewsController(_req: Request, res: Response) {
  return res.status(200).json(await listPendingReviews());
}

export async function approveReviewController(req: Request, res: Response) {
  return res.status(200).json(await approveReview(req.params.reviewId as string));
}

export async function rejectReviewController(req: Request, res: Response) {
  return res.status(200).json(await rejectReview(req.params.reviewId as string));
}

export async function removeReviewController(req: Request, res: Response) {
  return res.status(200).json(await removeReview(req.params.reviewId as string));
}

export async function createMediaController(req: Request, res: Response) {
  return res.status(201).json(await createMedia(req.body));
}

export async function approveCommentController(req: Request, res: Response) {
  return res.status(200).json(await approveComment(req.params.commentId as string));
}

export async function rejectCommentController(req: Request, res: Response) {
  return res.status(200).json(await rejectComment(req.params.commentId as string));
}

export async function removeCommentController(req: Request, res: Response) {
  return res.status(200).json(await removeComment(req.params.commentId as string));
}

export async function createCategoryController(req: Request, res: Response) {
  return res.status(201).json(await createCategory(req.body));
}

export async function deleteCategoryController(req: Request, res: Response) {
  return res.status(200).json(await deleteCategory(req.params.id as string));
}

export async function listUsersController(_req: Request, res: Response) {
  return res.status(200).json(await listAllUsers());
}

export async function updateUserRoleController(req: Request, res: Response) {
  return res
    .status(200)
    .json(await updateUserRole(req.params.userId as string, req.body.role as UserRole));
}
