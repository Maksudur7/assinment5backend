"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMediaController = listMediaController;
exports.getMediaController = getMediaController;
exports.trendingController = trendingController;
exports.featuredController = featuredController;
exports.newReleasesController = newReleasesController;
exports.recommendationsController = recommendationsController;
exports.updateMediaController = updateMediaController;
exports.deleteMediaController = deleteMediaController;
const errors_1 = require("../../utils/errors");
const media_service_1 = require("./media.service");
async function listMediaController(req, res) {
    return res.status(200).json(await (0, media_service_1.listMedia)(req.query));
}
async function getMediaController(req, res) {
    return res.status(200).json(await (0, media_service_1.getMediaById)(String(req.params.id)));
}
async function trendingController(req, res) {
    const limit = Number.parseInt(String(req.query.limit || 6), 10);
    return res.status(200).json(await (0, media_service_1.listTrending)(limit));
}
async function featuredController(_req, res) {
    return res.status(200).json(await (0, media_service_1.listFeatured)());
}
async function newReleasesController(req, res) {
    const limit = Number.parseInt(String(req.query.limit || 6), 10);
    return res.status(200).json(await (0, media_service_1.listNewReleases)(limit));
}
async function recommendationsController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(200).json(await (0, media_service_1.listRecommendations)(req.user.id));
}
async function updateMediaController(req, res) {
    return res.status(200).json(await (0, media_service_1.updateMedia)(String(req.params.id), req.body || {}));
}
async function deleteMediaController(req, res) {
    return res.status(200).json(await (0, media_service_1.removeMedia)(String(req.params.id)));
}
