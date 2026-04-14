"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listReviews = listReviews;
exports.createReview = createReview;
exports.updateReview = updateReview;
exports.deleteReview = deleteReview;
exports.toggleReviewLike = toggleReviewLike;
exports.addReviewComment = addReviewComment;
exports.listReviewComments = listReviewComments;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errors_1 = require("../../utils/errors");
async function listReviews(mediaId, limit, offset, includePending) {
    const media = await prisma_1.default.media.findUnique({ where: { id: mediaId } });
    if (!media)
        throw new errors_1.AppError("Media not found", 404, "MEDIA_NOT_FOUND");
    const reviews = await prisma_1.default.review.findMany({
        where: { mediaId, ...(includePending ? {} : { isPublished: true }) },
        include: { user: { select: { id: true, name: true } }, likes: true },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
    });
    return reviews.map((item) => ({
        id: item.id,
        mediaId: item.mediaId,
        userId: item.userId,
        userName: item.user.name,
        rating: item.rating,
        content: item.content,
        tags: item.tags,
        spoiler: item.spoiler,
        isPublished: item.isPublished,
        likes: item.likes.length,
        createdAt: item.createdAt,
    }));
}
async function createReview(mediaId, userId, payload) {
    if (payload.rating < 1 || payload.rating > 5) {
        throw new errors_1.AppError("rating must be between 1 and 5", 422, "VALIDATION_ERROR");
    }
    const media = await prisma_1.default.media.findUnique({ where: { id: mediaId } });
    if (!media)
        throw new errors_1.AppError("Media not found", 404, "MEDIA_NOT_FOUND");
    const review = await prisma_1.default.review.create({
        data: {
            mediaId,
            userId,
            rating: payload.rating,
            content: payload.content,
            tags: payload.tags || [],
            spoiler: payload.spoiler || false,
            isPublished: false,
            moderationStatus: "PENDING",
        },
        include: { user: { select: { name: true } }, likes: true },
    });
    return {
        id: review.id,
        mediaId: review.mediaId,
        userId: review.userId,
        userName: review.user.name,
        rating: review.rating,
        content: review.content,
        tags: review.tags,
        spoiler: review.spoiler,
        isPublished: review.isPublished,
        likes: review.likes.length,
        createdAt: review.createdAt,
    };
}
async function updateReview(reviewId, userId, payload) {
    const review = await prisma_1.default.review.findUnique({ where: { id: reviewId } });
    if (!review)
        throw new errors_1.AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    if (review.userId !== userId)
        throw new errors_1.AppError("Forbidden", 403, "FORBIDDEN");
    if (review.isPublished || review.moderationStatus !== "PENDING") {
        throw new errors_1.AppError("Only unpublished pending reviews can be edited", 400, "VALIDATION_ERROR");
    }
    const updated = await prisma_1.default.review.update({
        where: { id: reviewId },
        data: {
            ...(payload.rating !== undefined ? { rating: payload.rating } : {}),
            ...(payload.content ? { content: payload.content } : {}),
            ...(payload.tags ? { tags: payload.tags } : {}),
            ...(typeof payload.spoiler === "boolean" ? { spoiler: payload.spoiler } : {}),
        },
        include: { user: { select: { name: true } }, likes: true },
    });
    return {
        id: updated.id,
        mediaId: updated.mediaId,
        userId: updated.userId,
        userName: updated.user.name,
        rating: updated.rating,
        content: updated.content,
        tags: updated.tags,
        spoiler: updated.spoiler,
        isPublished: updated.isPublished,
        likes: updated.likes.length,
        createdAt: updated.createdAt,
    };
}
async function deleteReview(reviewId, userId) {
    const review = await prisma_1.default.review.findUnique({ where: { id: reviewId } });
    if (!review)
        throw new errors_1.AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    if (review.userId !== userId)
        throw new errors_1.AppError("Forbidden", 403, "FORBIDDEN");
    if (review.isPublished || review.moderationStatus !== "PENDING") {
        throw new errors_1.AppError("Only unpublished pending reviews can be deleted", 400, "VALIDATION_ERROR");
    }
    await prisma_1.default.review.delete({ where: { id: reviewId } });
    return { success: true };
}
async function toggleReviewLike(reviewId, userId) {
    const review = await prisma_1.default.review.findUnique({ where: { id: reviewId } });
    if (!review)
        throw new errors_1.AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    const existing = await prisma_1.default.reviewLike.findUnique({ where: { reviewId_userId: { reviewId, userId } } });
    let isLiked = false;
    if (existing) {
        await prisma_1.default.reviewLike.delete({ where: { reviewId_userId: { reviewId, userId } } });
    }
    else {
        await prisma_1.default.reviewLike.create({ data: { reviewId, userId } });
        isLiked = true;
    }
    const likes = await prisma_1.default.reviewLike.count({ where: { reviewId } });
    return { reviewId, likes, isLiked };
}
async function addReviewComment(reviewId, userId, content, parentCommentId) {
    const review = await prisma_1.default.review.findUnique({ where: { id: reviewId } });
    if (!review)
        throw new errors_1.AppError("Review not found", 404, "REVIEW_NOT_FOUND");
    const comment = await prisma_1.default.reviewComment.create({
        data: { reviewId, userId, content, parentCommentId },
        include: { user: { select: { name: true } } },
    });
    return {
        id: comment.id,
        reviewId: comment.reviewId,
        userId: comment.userId,
        userName: comment.user.name,
        content: comment.content,
        parentCommentId: comment.parentCommentId,
        createdAt: comment.createdAt,
    };
}
async function listReviewComments(reviewId) {
    const comments = await prisma_1.default.reviewComment.findMany({
        where: { reviewId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
    });
    return comments.map((comment) => ({
        id: comment.id,
        reviewId: comment.reviewId,
        userId: comment.userId,
        userName: comment.user.name,
        content: comment.content,
        parentCommentId: comment.parentCommentId,
        createdAt: comment.createdAt,
    }));
}
