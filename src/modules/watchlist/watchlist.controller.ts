import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import { getWatchlist, removeFromWatchlist, toggleWatchlist } from "./watchlist.service";

export async function getWatchlistController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json(await getWatchlist(req.user.id));
}

export async function toggleWatchlistController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json(await toggleWatchlist(req.user.id, String(req.params.mediaId)));
}

export async function deleteWatchlistController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json(await removeFromWatchlist(req.user.id, String(req.params.mediaId)));
}
