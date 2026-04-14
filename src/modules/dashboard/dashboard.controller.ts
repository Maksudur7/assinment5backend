import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import { getDashboardStats, getFavorites } from "./dashboard.service";

export async function getStatsController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json(await getDashboardStats(req.user.id));
}

export async function getFavoritesController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json(await getFavorites(req.user.id));
}
