"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listReviewsController = listReviewsController;
exports.createReviewController = createReviewController;
exports.updateReviewController = updateReviewController;
exports.deleteReviewController = deleteReviewController;
exports.likeReviewController = likeReviewController;
exports.addCommentController = addCommentController;
exports.listCommentsController = listCommentsController;
const errors_1 = require("../../utils/errors");
const reviews_service_1 = require("./reviews.service");
async function listReviewsController(req, res) {
    const limit = Number.parseInt(String(req.query.limit || 10), 10);
    const offset = Number.parseInt(String(req.query.offset || 0), 10);
    const includePending = String(req.query.includePending || "false") === "true";
    const data = await (0, reviews_service_1.listReviews)(String(req.params.mediaId), limit, offset, includePending);
    return res.status(200).json(data);
}
async function createReviewController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    const { rating, content, tags = [], spoiler = false } = req.body || {};
    if (!rating || !content)
        throw new errors_1.AppError("rating and content required", 422, "VALIDATION_ERROR");
    const data = await (0, reviews_service_1.createReview)(String(req.params.mediaId), req.user.id, { rating, content, tags, spoiler });
    return res.status(201).json(data);
}
async function updateReviewController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    const data = await (0, reviews_service_1.updateReview)(String(req.params.reviewId), req.user.id, req.body || {});
    return res.status(200).json(data);
}
async function deleteReviewController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    const data = await (0, reviews_service_1.deleteReview)(String(req.params.reviewId), req.user.id);
    return res.status(200).json(data);
}
async function likeReviewController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    const data = await (0, reviews_service_1.toggleReviewLike)(String(req.params.reviewId), req.user.id);
    return res.status(200).json(data);
}
async function addCommentController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    const { content, parentCommentId = null } = req.body || {};
    if (!content)
        throw new errors_1.AppError("content required", 422, "VALIDATION_ERROR");
    const data = await (0, reviews_service_1.addReviewComment)(String(req.params.reviewId), req.user.id, content, parentCommentId);
    return res.status(201).json(data);
}
async function listCommentsController(req, res) {
    const data = await (0, reviews_service_1.listReviewComments)(String(req.params.reviewId));
    return res.status(200).json(data);
}
