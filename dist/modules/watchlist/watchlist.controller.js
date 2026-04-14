"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWatchlistController = getWatchlistController;
exports.toggleWatchlistController = toggleWatchlistController;
exports.deleteWatchlistController = deleteWatchlistController;
const errors_1 = require("../../utils/errors");
const watchlist_service_1 = require("./watchlist.service");
async function getWatchlistController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(200).json(await (0, watchlist_service_1.getWatchlist)(req.user.id));
}
async function toggleWatchlistController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(200).json(await (0, watchlist_service_1.toggleWatchlist)(req.user.id, String(req.params.mediaId)));
}
async function deleteWatchlistController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(200).json(await (0, watchlist_service_1.removeFromWatchlist)(req.user.id, String(req.params.mediaId)));
}
