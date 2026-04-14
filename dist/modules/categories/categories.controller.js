"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCategoriesController = getCategoriesController;
exports.getCategoryVideosController = getCategoryVideosController;
const errors_1 = require("../../utils/errors");
const categories_service_1 = require("./categories.service");
async function getCategoriesController(_req, res) {
    return res.status(200).json(await (0, categories_service_1.listCategories)());
}
async function getCategoryVideosController(req, res) {
    const categoryName = String(req.params.categoryName || "").trim();
    if (!categoryName) {
        throw new errors_1.AppError("categoryName is required", 422, "VALIDATION_ERROR");
    }
    return res.status(200).json(await (0, categories_service_1.listCategoryVideos)(categoryName));
}
