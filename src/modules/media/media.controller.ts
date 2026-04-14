import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import {
	getMediaById,
	listFeatured,
	listMedia,
	listNewReleases,
	listRecommendations,
	listTrending,
	removeMedia,
	updateMedia,
} from "./media.service";

export async function listMediaController(req: Request, res: Response) {
	return res.status(200).json(await listMedia(req.query as Record<string, unknown>));
}

export async function getMediaController(req: Request, res: Response) {
	return res.status(200).json(await getMediaById(String(req.params.id)));
}

export async function trendingController(req: Request, res: Response) {
	const limit = Number.parseInt(String(req.query.limit || 6), 10);
	return res.status(200).json(await listTrending(limit));
}

export async function featuredController(_req: Request, res: Response) {
	return res.status(200).json(await listFeatured());
}

export async function newReleasesController(req: Request, res: Response) {
	const limit = Number.parseInt(String(req.query.limit || 6), 10);
	return res.status(200).json(await listNewReleases(limit));
}

export async function recommendationsController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json(await listRecommendations(req.user.id));
}

export async function updateMediaController(req: Request, res: Response) {
	return res.status(200).json(await updateMedia(String(req.params.id), req.body || {}));
}

export async function deleteMediaController(req: Request, res: Response) {
	return res.status(200).json(await removeMedia(String(req.params.id)));
}
