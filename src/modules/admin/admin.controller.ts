import { Request, Response } from "express";
import { approveReview, createMedia, getAdminOverview, listPendingReviews, rejectReview } from "./admin.service";

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
