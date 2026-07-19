"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWatchlist = getWatchlist;
exports.toggleWatchlist = toggleWatchlist;
exports.removeFromWatchlist = removeFromWatchlist;
exports.getHistory = getHistory;
exports.addToHistory = addToHistory;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errors_1 = require("../../utils/errors");
const media_1 = require("../../utils/media");
async function getWatchlist(userId) {
    const items = await prisma_1.default.watchlistItem.findMany({
        where: { userId },
        include: { media: true },
        orderBy: { addedAt: "desc" },
    });
    const medias = await (0, media_1.addMediaMetrics)(items.map((item) => item.media));
    const byId = new Map(medias.map((m) => [m.id, m]));
    return items.map((item) => ({
        id: item.media.id,
        title: item.media.title,
        poster: item.media.poster,
        genres: item.media.genres,
        releaseYear: item.media.releaseYear,
        avgRating: byId.get(item.media.id)?.avgRating || 0,
        addedAt: item.addedAt,
    }));
}
async function toggleWatchlist(userId, mediaId) {
    const media = await prisma_1.default.media.findUnique({ where: { id: mediaId } });
    if (!media)
        throw new errors_1.AppError("Media not found", 404, "MEDIA_NOT_FOUND");
    const existing = await prisma_1.default.watchlistItem.findUnique({ where: { userId_mediaId: { userId, mediaId } } });
    if (existing) {
        await prisma_1.default.watchlistItem.delete({ where: { userId_mediaId: { userId, mediaId } } });
        return { mediaId, action: "removed" };
    }
    await prisma_1.default.watchlistItem.create({ data: { userId, mediaId } });
    return { mediaId, action: "added" };
}
async function removeFromWatchlist(userId, mediaId) {
    await prisma_1.default.watchlistItem.deleteMany({ where: { userId, mediaId } });
    return { success: true };
}
async function getHistory(userId) {
    const items = await prisma_1.default.watchHistory.findMany({
        where: { userId },
        include: { media: true },
        orderBy: { watchedAt: "desc" },
    });
    const medias = await (0, media_1.addMediaMetrics)(items.map((item) => item.media));
    const byId = new Map(medias.map((m) => [m.id, m]));
    return items.map((item) => ({
        id: item.media.id,
        title: item.media.title,
        poster: item.media.poster,
        genres: item.media.genres,
        releaseYear: item.media.releaseYear,
        avgRating: byId.get(item.media.id)?.avgRating || 0,
        watchedAt: item.watchedAt,
    }));
}
async function addToHistory(userId, mediaId) {
    // Upsert to update watchedAt if already exists
    const existing = await prisma_1.default.watchHistory.findFirst({ where: { userId, mediaId } });
    if (existing) {
        await prisma_1.default.watchHistory.update({
            where: { id: existing.id },
            data: { watchedAt: new Date() }
        });
        return { success: true, updated: true };
    }
    await prisma_1.default.watchHistory.create({
        data: { userId, mediaId, watchedAt: new Date() }
    });
    return { success: true, added: true };
}
