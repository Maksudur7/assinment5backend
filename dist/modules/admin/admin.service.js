"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminOverview = getAdminOverview;
exports.listPendingReviews = listPendingReviews;
exports.approveReview = approveReview;
exports.rejectReview = rejectReview;
exports.createMedia = createMedia;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errors_1 = require("../../utils/errors");
const media_1 = require("../../utils/media");
async function getAdminOverview() {
    const [totalUsers, totalMedia, purchases, pendingReviews, activeSubscriptions] = await Promise.all([
        prisma_1.default.user.count(),
        prisma_1.default.media.count(),
        prisma_1.default.purchase.findMany({ where: { status: "active" } }),
        prisma_1.default.review.count({ where: { moderationStatus: "PENDING" } }),
        prisma_1.default.purchase.count({ where: { type: "subscription", status: "active" } }),
    ]);
    return {
        totalUsers,
        totalMedia,
        totalRevenue: purchases.reduce((sum, p) => sum + p.amount, 0) / 100,
        pendingReviews,
        activeSubscriptions,
    };
}
async function listPendingReviews() {
    const reviews = await prisma_1.default.review.findMany({ where: { moderationStatus: "PENDING" }, include: { user: true, media: true } });
    return reviews.map((item) => ({
        id: item.id,
        mediaTitle: item.media.title,
        userName: item.user.name,
        rating: item.rating,
        content: item.content,
        createdAt: item.createdAt,
    }));
}
async function approveReview(reviewId) {
    const review = await prisma_1.default.review.findUnique({ where: { id: reviewId } });
    if (!review)
        throw new errors_1.AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    await prisma_1.default.review.update({ where: { id: reviewId }, data: { moderationStatus: "APPROVED", isPublished: true } });
    return { success: true, reviewId };
}
async function rejectReview(reviewId) {
    const review = await prisma_1.default.review.findUnique({ where: { id: reviewId } });
    if (!review)
        throw new errors_1.AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    await prisma_1.default.review.update({ where: { id: reviewId }, data: { moderationStatus: "REJECTED", isPublished: false } });
    return { success: true, reviewId };
}
async function createMedia(payload) {
    const requiredFields = [
        "title",
        "synopsis",
        "genres",
        "releaseYear",
        "director",
        "cast",
        "platforms",
        "pricing",
        "streamingUrl",
        "poster",
        "duration",
    ];
    for (const field of requiredFields) {
        if (payload?.[field] === undefined || payload?.[field] === null) {
            throw new errors_1.AppError(`${field} is required`, 422, "VALIDATION_ERROR");
        }
    }
    const created = await prisma_1.default.media.create({ data: payload });
    const [enriched] = await (0, media_1.addMediaMetrics)([created]);
    return enriched;
}
