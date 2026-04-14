"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMedia = listMedia;
exports.getMediaById = getMediaById;
exports.listTrending = listTrending;
exports.listFeatured = listFeatured;
exports.listNewReleases = listNewReleases;
exports.listRecommendations = listRecommendations;
exports.updateMedia = updateMedia;
exports.removeMedia = removeMedia;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errors_1 = require("../../utils/errors");
const media_1 = require("../../utils/media");
function parseIntSafe(value, fallback) {
    const parsed = Number.parseInt(String(value), 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}
function parseFloatSafe(value, fallback) {
    const parsed = Number.parseFloat(String(value));
    return Number.isNaN(parsed) ? fallback : parsed;
}
async function listMedia(query) {
    const page = parseIntSafe(query.page, 1);
    const pageSize = parseIntSafe(query.pageSize, 12);
    const search = query.search ? String(query.search) : undefined;
    const genre = query.genre ? String(query.genre) : undefined;
    const platform = query.platform ? String(query.platform) : undefined;
    const releaseYear = query.releaseYear ? parseIntSafe(query.releaseYear, 0) : undefined;
    const minPopularity = query.minPopularity ? parseIntSafe(query.minPopularity, 0) : undefined;
    const minRating = query.minRating ? parseFloatSafe(query.minRating, 0) : 0;
    const maxRating = query.maxRating ? parseFloatSafe(query.maxRating, 10) : 10;
    const sort = query.sort ? String(query.sort) : "latest";
    const where = {
        ...(search
            ? {
                OR: [
                    { title: { contains: search, mode: "insensitive" } },
                    { synopsis: { contains: search, mode: "insensitive" } },
                    { director: { contains: search, mode: "insensitive" } },
                ],
            }
            : {}),
        ...(genre ? { genres: { has: genre } } : {}),
        ...(platform ? { platforms: { has: platform } } : {}),
        ...(releaseYear ? { releaseYear } : {}),
        ...(minPopularity ? { popularity: { gte: minPopularity } } : {}),
    };
    const orderBy = sort === "latest" ? { createdAt: "desc" } : { popularity: "desc" };
    const [items, total] = await Promise.all([
        prisma_1.default.media.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
        prisma_1.default.media.count({ where }),
    ]);
    const enriched = await (0, media_1.addMediaMetrics)(items);
    const filtered = enriched.filter((item) => item.avgRating >= minRating && item.avgRating <= maxRating);
    return { items: filtered, total: filtered.length || total, page, pageSize };
}
async function getMediaById(id) {
    const media = await prisma_1.default.media.findUnique({ where: { id } });
    if (!media)
        throw new errors_1.AppError("Media not found", 404, "MEDIA_NOT_FOUND");
    const [enriched] = await (0, media_1.addMediaMetrics)([media]);
    return enriched;
}
async function listTrending(limit) {
    return (0, media_1.addMediaMetrics)(await prisma_1.default.media.findMany({ orderBy: { popularity: "desc" }, take: limit }));
}
async function listFeatured() {
    return (0, media_1.addMediaMetrics)(await prisma_1.default.media.findMany({ orderBy: { releaseYear: "desc" }, take: 6 }));
}
async function listNewReleases(limit) {
    return (0, media_1.addMediaMetrics)(await prisma_1.default.media.findMany({ orderBy: { createdAt: "desc" }, take: limit }));
}
async function listRecommendations(userId) {
    const watchlist = await prisma_1.default.watchlistItem.findMany({ where: { userId }, include: { media: true }, take: 20 });
    const topGenres = watchlist.flatMap((w) => w.media.genres).slice(0, 3);
    const items = await prisma_1.default.media.findMany({
        where: topGenres.length ? { genres: { hasSome: topGenres } } : undefined,
        orderBy: { popularity: "desc" },
        take: 12,
    });
    return (0, media_1.addMediaMetrics)(items);
}
async function updateMedia(id, payload) {
    const media = await prisma_1.default.media.findUnique({ where: { id } });
    if (!media)
        throw new errors_1.AppError("Media not found", 404, "MEDIA_NOT_FOUND");
    const updated = await prisma_1.default.media.update({ where: { id }, data: payload });
    const [enriched] = await (0, media_1.addMediaMetrics)([updated]);
    return enriched;
}
async function removeMedia(id) {
    const media = await prisma_1.default.media.findUnique({ where: { id } });
    if (!media)
        throw new errors_1.AppError("Media not found", 404, "MEDIA_NOT_FOUND");
    await prisma_1.default.media.delete({ where: { id } });
    return { success: true, message: "Media deleted" };
}
