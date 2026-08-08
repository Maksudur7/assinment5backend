import { Request, Response } from "express";
import {
  approveReview,
  createMedia,
  getAdminOverview,
  listPendingReviews,
  listPendingComments,
  rejectReview,
  approveComment,
  rejectComment,
  removeComment,
  createCategory,
  deleteCategory,
} from "./admin.service";

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
	return res.status(200).json(await approveReview(String(req.params.reviewId)));
}

export async function rejectReviewController(req: Request, res: Response) {
	return res.status(200).json(await rejectReview(String(req.params.reviewId)));
}

export async function createMediaController(req: Request, res: Response) {
	return res.status(201).json(await createMedia(req.body || {}));
}

export async function approveCommentController(req: Request, res: Response) {
  return res.status(200).json(await approveComment(String(req.params.commentId)));
}

export async function rejectCommentController(req: Request, res: Response) {
  return res.status(200).json(await rejectComment(String(req.params.commentId)));
}

export async function removeCommentController(req: Request, res: Response) {
  return res.status(200).json(await removeComment(String(req.params.commentId)));
}

export async function createCategoryController(req: Request, res: Response) {
  return res.status(201).json(await createCategory(req.body || {}));
}

export async function deleteCategoryController(req: Request, res: Response) {
  return res.status(200).json(await deleteCategory(String(req.params.id)));
}

export async function listUsersController(_req: Request, res: Response) {
  const { listAllUsers } = await import("./admin.service");
  return res.status(200).json(await listAllUsers());
}

export async function updateUserRoleController(req: Request, res: Response) {
  const { updateUserRole } = await import("./admin.service");
  return res.status(200).json(await updateUserRole(String(req.params.userId), String(req.body.role)));
}
