"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeController = getMeController;
exports.updateMeController = updateMeController;
exports.watchHistoryController = watchHistoryController;
exports.updateProgressController = updateProgressController;
const errors_1 = require("../../utils/errors");
const users_service_1 = require("./users.service");
async function getMeController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(200).json(await (0, users_service_1.getCurrentUser)(req.user.id));
}
async function updateMeController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    const { name, email } = req.body || {};
    return res.status(200).json(await (0, users_service_1.updateCurrentUser)(req.user.id, name, email));
}
async function watchHistoryController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    const limit = Number.parseInt(String(req.query.limit || 10), 10);
    const offset = Number.parseInt(String(req.query.offset || 0), 10);
    return res.status(200).json(await (0, users_service_1.listWatchHistory)(req.user.id, limit, offset));
}
async function updateProgressController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    const progressSeconds = Number.parseInt(String(req.body?.progressSeconds), 10);
    if (Number.isNaN(progressSeconds) || progressSeconds < 0) {
        throw new errors_1.AppError("progressSeconds must be a positive integer", 422, "VALIDATION_ERROR");
    }
    return res.status(200).json(await (0, users_service_1.updateWatchProgress)(req.user.id, String(req.params.mediaId), progressSeconds));
}
