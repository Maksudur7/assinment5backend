"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPurchaseHistory = getPurchaseHistory;
exports.getAllPurchases = getAllPurchases;
exports.createPurchase = createPurchase;
exports.revokePurchase = revokePurchase;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errors_1 = require("../../utils/errors");
function calculateAmountCents(type, plan) {
    if (type === "rent")
        return 499;
    if (type === "buy")
        return 1299;
    if (type === "subscription")
        return plan === "yearly" ? 9999 : 999;
    return 0;
}
function calculateExpiry(type, plan) {
    const now = new Date();
    if (type === "rent")
        return new Date(now.getTime() + 1000 * 60 * 60 * 48);
    if (type === "subscription") {
        return new Date(now.getTime() + (plan === "yearly" ? 1000 * 60 * 60 * 24 * 365 : 1000 * 60 * 60 * 24 * 30));
    }
    return null;
}
async function getPurchaseHistory(userId) {
    const purchases = await prisma_1.default.purchase.findMany({ where: { userId }, include: { media: true }, orderBy: { createdAt: "desc" } });
    return purchases.map((item) => ({
        id: item.id,
        type: item.type,
        mediaId: item.mediaId,
        mediaTitle: item.media?.title || null,
        provider: item.provider,
        amount: item.amount / 100,
        status: item.status,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
    }));
}
async function getAllPurchases() {
    return prisma_1.default.purchase.findMany({ include: { media: true, user: true }, orderBy: { createdAt: "desc" } });
}
async function createPurchase(userId, payload) {
    const { type, mediaId = null, plan = null, provider, method, cardLast4 = null, sendConfirmationEmail = false } = payload || {};
    if (!["rent", "buy", "subscription"].includes(type))
        throw new errors_1.AppError("Invalid purchase type", 422, "VALIDATION_ERROR");
    if (!["stripe", "paypal", "razorpay"].includes(provider) || !["card", "wallet"].includes(method)) {
        throw new errors_1.AppError("Invalid provider or method", 422, "VALIDATION_ERROR");
    }
    if (type !== "subscription" && !mediaId)
        throw new errors_1.AppError("mediaId is required for rent/buy", 422, "VALIDATION_ERROR");
    if (mediaId) {
        const media = await prisma_1.default.media.findUnique({ where: { id: mediaId } });
        if (!media)
            throw new errors_1.AppError("Media not found", 404, "MEDIA_NOT_FOUND");
    }
    const purchase = await prisma_1.default.purchase.create({
        data: {
            userId,
            mediaId,
            type,
            plan,
            provider,
            method,
            amount: calculateAmountCents(type, plan),
            cardLast4,
            sendConfirmationEmail,
            status: "active",
            expiresAt: calculateExpiry(type, plan),
        },
    });
    return {
        id: purchase.id,
        clientSecret: `pi_${crypto_1.default.randomBytes(12).toString("hex")}`,
        redirectUrl: `https://checkout.${provider}.com/pay/${purchase.id}`,
    };
}
async function revokePurchase(purchaseId, userId, role) {
    const purchase = await prisma_1.default.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase)
        throw new errors_1.AppError("Purchase not found", 404, "NOT_FOUND");
    if (purchase.userId !== userId && role !== "admin")
        throw new errors_1.AppError("Forbidden", 403, "FORBIDDEN");
    const updated = await prisma_1.default.purchase.update({ where: { id: purchaseId }, data: { status: "revoked" } });
    return { success: true, refundAmount: updated.amount / 100 };
}
