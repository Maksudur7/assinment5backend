"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const async_handler_1 = require("../../utils/async-handler");
const categories_controller_1 = require("./categories.controller");
const categoriesRouter = (0, express_1.Router)();
categoriesRouter.get("/", (0, async_handler_1.asyncHandler)(categories_controller_1.getCategoriesController));
categoriesRouter.get("/:categoryName/videos", (0, async_handler_1.asyncHandler)(categories_controller_1.getCategoryVideosController));
exports.default = categoriesRouter;
