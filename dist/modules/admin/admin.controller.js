"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pendingCommentsController = pendingCommentsController;
exports.adminOverviewController = adminOverviewController;
exports.pendingReviewsController = pendingReviewsController;
exports.approveReviewController = approveReviewController;
exports.rejectReviewController = rejectReviewController;
exports.createMediaController = createMediaController;
const admin_service_1 = require("./admin.service");
async function pendingCommentsController(_req, res) {
    return res.status(200).json(await (0, admin_service_1.listPendingComments)());
}
async function adminOverviewController(_req, res) {
    return res.status(200).json(await (0, admin_service_1.getAdminOverview)());
}
async function pendingReviewsController(_req, res) {
    return res.status(200).json(await (0, admin_service_1.listPendingReviews)());
}
async function approveReviewController(req, res) {
    return res.status(200).json(await (0, admin_service_1.approveReview)(String(req.params.reviewId)));
}
async function rejectReviewController(req, res) {
    return res.status(200).json(await (0, admin_service_1.rejectReview)(String(req.params.reviewId)));
}
async function createMediaController(req, res) {
    return res.status(201).json(await (0, admin_service_1.createMedia)(req.body || {}));
}
