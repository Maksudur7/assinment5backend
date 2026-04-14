"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMediaMetrics = addMediaMetrics;
const prisma_1 = __importDefault(require("../lib/prisma"));
async function addMediaMetrics(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return [];
    }
    const mediaIds = items.map((item) => item.id);
    const grouped = await prisma_1.default.review.groupBy({
        by: ["mediaId"],
        where: { mediaId: { in: mediaIds }, isPublished: true },
        _count: { _all: true },
        _avg: { rating: true },
    });
    const metricsById = new Map(grouped.map((g) => [g.mediaId, g]));
    return items.map((item) => {
        const metric = metricsById.get(item.id);
        const totalReviews = metric?._count?._all || 0;
        const avgRatingRaw = metric?._avg?.rating || 0;
        return {
            ...item,
            avgRating: Number(Number(avgRatingRaw).toFixed(1)),
            totalReviews,
        };
    });
}
