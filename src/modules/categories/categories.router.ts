import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { getCategoriesController, getCategoryVideosController } from "./categories.controller";

const categoriesRouter = Router();

categoriesRouter.get("/", asyncHandler(getCategoriesController));
categoriesRouter.get("/:categoryName/videos", asyncHandler(getCategoryVideosController));

export default categoriesRouter;
