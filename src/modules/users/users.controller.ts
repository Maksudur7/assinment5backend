import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import { getCurrentUser, listWatchHistory, updateCurrentUser, updateWatchProgress } from "./users.service";

export async function getMeController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json(await getCurrentUser(req.user.id));
}

export async function updateMeController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	const { name, email } = req.body || {};
	return res.status(200).json(await updateCurrentUser(req.user.id, name, email));
}

export async function watchHistoryController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	const limit = Number.parseInt(String(req.query.limit || 10), 10);
	const offset = Number.parseInt(String(req.query.offset || 0), 10);
	return res.status(200).json(await listWatchHistory(req.user.id, limit, offset));
}

export async function updateProgressController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	const progressSeconds = Number.parseInt(String(req.body?.progressSeconds), 10);
	if (Number.isNaN(progressSeconds) || progressSeconds < 0) {
		throw new AppError("progressSeconds must be a positive integer", 422, "VALIDATION_ERROR");
	}
	return res.status(200).json(await updateWatchProgress(req.user.id, String(req.params.mediaId), progressSeconds));
}
