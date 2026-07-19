"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = getDashboardStats;
exports.getFavorites = getFavorites;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const time_1 = require("../../utils/time");
const media_1 = require("../../utils/media");
async function getDashboardStats(userId) {
    const [history] = await Promise.all([
        prisma_1.default.watchHistory.findMany({ where: { userId } }),
    ]);
    const totalSeconds = history.reduce((acc, item) => acc + item.progressSeconds, 0);
    return {
        totalWatchTime: (0, time_1.secondsToReadable)(totalSeconds),
        currentPlan: "free",
        planExpiresAt: null,
    };
}
async function getFavorites(userId) {
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
        avgRating: byId.get(item.media.id)?.avgRating || 0,
        addedAt: item.addedAt,
    }));
}
