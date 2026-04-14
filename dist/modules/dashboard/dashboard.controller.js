"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatsController = getStatsController;
exports.getFavoritesController = getFavoritesController;
const errors_1 = require("../../utils/errors");
const dashboard_service_1 = require("./dashboard.service");
async function getStatsController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(200).json(await (0, dashboard_service_1.getDashboardStats)(req.user.id));
}
async function getFavoritesController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(200).json(await (0, dashboard_service_1.getFavorites)(req.user.id));
}
