"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = getCurrentUser;
exports.updateCurrentUser = updateCurrentUser;
exports.listWatchHistory = listWatchHistory;
exports.updateWatchProgress = updateWatchProgress;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errors_1 = require("../../utils/errors");
async function getCurrentUser(userId) {
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true },
    });
    if (!user)
        throw new errors_1.AppError("User not found", 404, "USER_NOT_FOUND");
    return user;
}
async function updateCurrentUser(userId, name, email) {
    if (!name && !email)
        throw new errors_1.AppError("Nothing to update", 422, "VALIDATION_ERROR");
    if (email) {
        const duplicate = await prisma_1.default.user.findFirst({ where: { email, NOT: { id: userId } } });
        if (duplicate)
            throw new errors_1.AppError("Email already in use", 409, "VALIDATION_ERROR");
    }
    return prisma_1.default.user.update({
        where: { id: userId },
        data: { ...(name ? { name } : {}), ...(email ? { email } : {}) },
        select: { id: true, name: true, email: true, role: true },
    });
}
async function listWatchHistory(userId, limit, offset) {
    const history = await prisma_1.default.watchHistory.findMany({
        where: { userId },
        include: { media: true },
        orderBy: { watchedAt: "desc" },
        skip: offset,
        take: limit,
    });
    return history.map((item) => ({
        mediaId: item.mediaId,
        title: item.media.title,
        poster: item.media.poster,
        watchedAt: item.watchedAt,
        progressSeconds: item.progressSeconds,
    }));
}
async function updateWatchProgress(userId, mediaId, progressSeconds) {
    const media = await prisma_1.default.media.findUnique({ where: { id: mediaId } });
    if (!media)
        throw new errors_1.AppError("Media not found", 404, "MEDIA_NOT_FOUND");
    const progress = await prisma_1.default.watchProgress.upsert({
        where: { userId_mediaId: { userId, mediaId } },
        create: { userId, mediaId, progressSeconds },
        update: { progressSeconds },
    });
    await prisma_1.default.watchHistory.create({ data: { userId, mediaId, progressSeconds } });
    return { mediaId, progressSeconds: progress.progressSeconds, updatedAt: progress.updatedAt };
}
