"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamViewerStatsController = streamViewerStatsController;
exports.incrementViewController = incrementViewController;
exports.decrementViewerController = decrementViewerController;
exports.getViewStatsController = getViewStatsController;
exports.listMediaController = listMediaController;
exports.getMediaController = getMediaController;
exports.trendingController = trendingController;
exports.featuredController = featuredController;
exports.newReleasesController = newReleasesController;
exports.recommendationsController = recommendationsController;
exports.updateMediaController = updateMediaController;
exports.searchMediaController = searchMediaController;
exports.watchTokenController = watchTokenController;
exports.createMediaController = createMediaController;
exports.deleteMediaController = deleteMediaController;
const errors_1 = require("../../utils/errors");
const media_service_1 = require("./media.service");
const watch_token_1 = require("../../lib/watch-token");
// Optimized SSE Subscription Manager
const subscriptions = new Map();
setInterval(async () => {
    for (const [mediaId, clients] of subscriptions.entries()) {
        if (clients.size > 0) {
            try {
                const stats = await (0, media_service_1.getViewStats)(mediaId);
                const payload = `data: ${JSON.stringify(stats)}\n\n`;
                for (const res of clients)
                    res.write(payload);
            }
            catch (e) {
                console.error("SSE Poll error", e);
            }
        }
    }
}, 5000);
async function streamViewerStatsController(req, res) {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    });
    const mediaId = String(req.params.id);
    if (!subscriptions.has(mediaId))
        subscriptions.set(mediaId, new Set());
    subscriptions.get(mediaId).add(res);
    try {
        const initialStats = await (0, media_service_1.getViewStats)(mediaId);
        res.write(`data: ${JSON.stringify(initialStats)}\n\n`);
    }
    catch (e) { }
    req.on("close", () => {
        subscriptions.get(mediaId)?.delete(res);
    });
}
async function incrementViewController(req, res) {
    const stats = await (0, media_service_1.incrementView)(String(req.params.id));
    return res.status(200).json(stats);
}
async function decrementViewerController(req, res) {
    const stats = await (0, media_service_1.decrementViewer)(String(req.params.id));
    return res.status(200).json(stats);
}
async function getViewStatsController(req, res) {
    const stats = await (0, media_service_1.getViewStats)(String(req.params.id));
    return res.status(200).json(stats);
}
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
async function searchMediaController(req, res) {
    const q = String(req.query.q || "").trim();
    if (!q)
        return res.status(200).json([]);
    return res.status(200).json(await (0, media_service_1.searchMedia)(q));
}
async function watchTokenController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    const mediaId = String(req.params.id);
    const media = await (0, media_service_1.getMediaById)(mediaId);
    if (!media)
        throw new errors_1.AppError("Not found", 404, "NOT_FOUND");
    const token = (0, watch_token_1.generateWatchToken)(req.user.id, mediaId);
    return res.status(200).json({ token, expiresInSeconds: 15 * 60 });
}
async function createMediaController(req, res) {
    return res.status(201).json(await (0, media_service_1.createMedia)(req.body || {}));
}
async function deleteMediaController(req, res) {
    return res.status(200).json(await (0, media_service_1.removeMedia)(String(req.params.id)));
}
