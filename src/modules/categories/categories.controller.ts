import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import { listCategories, listCategoryVideos } from "./categories.service";

export async function getCategoriesController(_req: Request, res: Response) {
	return res.status(200).json(await listCategories());
}

export async function getCategoryVideosController(req: Request, res: Response) {
	const categoryName = String(req.params.categoryName || "").trim();
	if (!categoryName) {
		throw new AppError("categoryName is required", 422, "VALIDATION_ERROR");
	}

	return res.status(200).json(await listCategoryVideos(categoryName));
}
