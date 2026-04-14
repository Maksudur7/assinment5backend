import crypto from "crypto";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";

function calculateAmountCents(type: string, plan: string | null) {
	if (type === "rent") return 499;
	if (type === "buy") return 1299;
	if (type === "subscription") return plan === "yearly" ? 9999 : 999;
	return 0;
}

function calculateExpiry(type: string, plan: string | null) {
	const now = new Date();
	if (type === "rent") return new Date(now.getTime() + 1000 * 60 * 60 * 48);
	if (type === "subscription") {
		return new Date(now.getTime() + (plan === "yearly" ? 1000 * 60 * 60 * 24 * 365 : 1000 * 60 * 60 * 24 * 30));
	}
	return null;
}

export async function getPurchaseHistory(userId: string) {
	const purchases = await prisma.purchase.findMany({ where: { userId }, include: { media: true }, orderBy: { createdAt: "desc" } });
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

export async function getAllPurchases() {
	return prisma.purchase.findMany({ include: { media: true, user: true }, orderBy: { createdAt: "desc" } });
}

export async function createPurchase(userId: string, payload: any) {
	const { type, mediaId = null, plan = null, provider, method, cardLast4 = null, sendConfirmationEmail = false } = payload || {};

	if (!["rent", "buy", "subscription"].includes(type)) throw new AppError("Invalid purchase type", 422, "VALIDATION_ERROR");
	if (!["stripe", "paypal", "razorpay"].includes(provider) || !["card", "wallet"].includes(method)) {
		throw new AppError("Invalid provider or method", 422, "VALIDATION_ERROR");
	}
	if (type !== "subscription" && !mediaId) throw new AppError("mediaId is required for rent/buy", 422, "VALIDATION_ERROR");

	if (mediaId) {
		const media = await prisma.media.findUnique({ where: { id: mediaId } });
		if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
	}

	const purchase = await prisma.purchase.create({
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
		clientSecret: `pi_${crypto.randomBytes(12).toString("hex")}`,
		redirectUrl: `https://checkout.${provider}.com/pay/${purchase.id}`,
	};
}

export async function revokePurchase(purchaseId: string, userId: string, role: string) {
	const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
	if (!purchase) throw new AppError("Purchase not found", 404, "NOT_FOUND");
	if (purchase.userId !== userId && role !== "admin") throw new AppError("Forbidden", 403, "FORBIDDEN");

	const updated = await prisma.purchase.update({ where: { id: purchaseId }, data: { status: "revoked" } });
	return { success: true, refundAmount: updated.amount / 100 };
}
