import crypto from "crypto";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { env } from "../../config/env";
import { AppError } from "../../utils/errors";

const stripeClient = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

type SubscriptionPlan = "monthly" | "yearly";
type CheckoutMethod = "card" | "wallet";
type PaymentMethodTypeValue = "visa" | "debit_card" | "credit_card" | "bkash" | "nagad" | "rocket";
type PaymentGatewayProviderValue = "stripe" | "sslcommerz" | "portwallet" | "bkash" | "nagad" | "rocket";
type PaymentCheckoutStatusValue = "pending" | "processing" | "paid" | "failed";

const SUBSCRIPTION_PRICE_CENTS: Record<SubscriptionPlan, number> = {
	monthly: 999,
	yearly: 9999,
};

const CARD_METHODS = new Set(["visa", "debit_card", "credit_card"]);
const WALLET_METHODS = new Set(["bkash", "nagad", "rocket"]);

function calculateAmountCents(type: string, plan: string | null) {
	if (type === "rent") return 499;
	if (type === "buy") return 1299;
	if (type === "subscription") {
		if (plan !== "monthly" && plan !== "yearly") {
			throw new AppError("Invalid subscription plan", 422, "VALIDATION_ERROR");
		}
		return SUBSCRIPTION_PRICE_CENTS[plan];
	}
	throw new AppError("Invalid purchase type", 422, "VALIDATION_ERROR");
}

function calculateExpiry(type: string, plan: string | null) {
	const now = new Date();
	if (type === "rent") return new Date(now.getTime() + 1000 * 60 * 60 * 48);
	if (type === "subscription") {
		return new Date(now.getTime() + (plan === "yearly" ? 1000 * 60 * 60 * 24 * 365 : 1000 * 60 * 60 * 24 * 30));
	}
	return null;
}

function normalizeMethodType(value: string): PaymentMethodTypeValue {
	const normalized = value.trim().toLowerCase();
	if (["visa", "debit_card", "credit_card", "bkash", "nagad", "rocket"].includes(normalized)) {
		return normalized as PaymentMethodTypeValue;
	}
	throw new AppError("Unsupported paymentMethod", 422, "VALIDATION_ERROR");
}

function normalizeProvider(value?: string): PaymentGatewayProviderValue {
	if (!value) return "stripe";
	const provider = value.trim().toLowerCase();
	if (["stripe", "sslcommerz", "portwallet", "bkash", "nagad", "rocket"].includes(provider)) {
		return provider as PaymentGatewayProviderValue;
	}
	throw new AppError("Unsupported provider", 422, "VALIDATION_ERROR");
}

function maskWalletNumber(walletNumber: string) {
	const digits = walletNumber.replace(/\D/g, "");
	if (digits.length < 4) return "****";
	return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function tokenizeCard(card: { number: string; holder: string; expiry: string; cvv: string }) {
	const cleanedNumber = String(card.number || "").replace(/\s+/g, "");
	if (!/^\d{13,19}$/.test(cleanedNumber)) {
		throw new AppError("Invalid card number", 422, "VALIDATION_ERROR");
	}
	if (!/^\d{3,4}$/.test(String(card.cvv || ""))) {
		throw new AppError("Invalid card CVV", 422, "VALIDATION_ERROR");
	}

	const digest = crypto
		.createHmac("sha256", env.paymentTokenizationSecret)
		.update(`${cleanedNumber}|${card.holder}|${card.expiry}|${Date.now()}`)
		.digest("hex");

	return {
		token: `tok_${digest}`,
		last4: cleanedNumber.slice(-4),
	};
}

function statusMessage(status: string) {
	if (status === "paid") return "Payment completed";
	if (status === "failed") return "Payment failed";
	if (status === "processing") return "Payment is processing";
	return "Checkout created";
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
	if (value === undefined) return undefined;
	return value as Prisma.InputJsonValue;
}

async function writeAuditLog(data: {
	checkoutId?: string;
	transactionId?: string;
	source: string;
	event: string;
	requestBody?: unknown;
	responseBody?: unknown;
	responseCode?: number;
}) {
	await prisma.paymentAuditLog.create({
		data: {
			checkoutId: data.checkoutId,
			transactionId: data.transactionId,
			source: data.source,
			event: data.event,
			requestBody: toJsonInput(data.requestBody),
			responseBody: toJsonInput(data.responseBody),
			responseCode: data.responseCode,
		},
	});
}

async function createGatewaySession(params: {
	checkoutId: string;
	amount: number;
	currency: string;
	method: CheckoutMethod;
	provider: PaymentGatewayProviderValue;
	paymentMethodType: PaymentMethodTypeValue;
	userId: string;
	plan: SubscriptionPlan;
}): Promise<{
	transactionId: string;
	paymentUrl: string;
	clientSecret: string | null;
	gatewayRef: string;
	status: PaymentCheckoutStatusValue;
}> {
	if (params.provider === "stripe" && params.method === "card" && stripeClient) {
		const intent = await stripeClient.paymentIntents.create({
			amount: params.amount,
			currency: params.currency.toLowerCase(),
			automatic_payment_methods: { enabled: true },
			metadata: {
				checkoutId: params.checkoutId,
				userId: params.userId,
				plan: params.plan,
				paymentMethodType: params.paymentMethodType,
			},
		});

		return {
			transactionId: intent.id,
			paymentUrl: `https://dashboard.stripe.com/test/payments/${intent.id}`,
			clientSecret: intent.client_secret,
			gatewayRef: intent.id,
			status: intent.status === "succeeded" ? "paid" : "pending",
		};
	}

	// If not stripe, must implement real gateway logic
	throw new AppError("Payment gateway not implemented for this provider/method. No dummy data allowed.", 501, "NOT_IMPLEMENTED");
}

async function ensureSubscriptionEntitlement(checkout: {
	checkoutId: string;
	transactionId: string;
	userId: string;
	plan: string | null;
	provider: string;
	method: CheckoutMethod;
	amount: number;
	cardLast4: string | null;
	emailReceipt: boolean;
	paidAt: Date | null;
}) {
	const plan = checkout.plan === "yearly" ? "yearly" : "monthly";
	const paidAt = checkout.paidAt || new Date();
	const expiresAt = calculateExpiry("subscription", plan);

	const latestActive = await prisma.purchase.findFirst({
		where: { userId: checkout.userId, type: "subscription", status: "active" },
		orderBy: { createdAt: "desc" },
	});

	if (latestActive) {
		await prisma.purchase.update({
			where: { id: latestActive.id },
			data: {
				plan,
				provider: checkout.provider === "paypal" || checkout.provider === "razorpay" ? checkout.provider : "stripe",
				method: checkout.method,
				amount: checkout.amount,
				cardLast4: checkout.cardLast4,
				sendConfirmationEmail: checkout.emailReceipt,
				checkoutId: checkout.checkoutId,
				gatewayTransactionId: checkout.transactionId,
				expiresAt,
				updatedAt: paidAt,
			},
		});
		return;
	}

	await prisma.purchase.create({
		data: {
			userId: checkout.userId,
			type: "subscription",
			plan,
			provider: checkout.provider === "paypal" || checkout.provider === "razorpay" ? checkout.provider : "stripe",
			method: checkout.method,
			amount: checkout.amount,
			cardLast4: checkout.cardLast4,
			sendConfirmationEmail: checkout.emailReceipt,
			checkoutId: checkout.checkoutId,
			gatewayTransactionId: checkout.transactionId,
			status: "active",
			expiresAt,
		},
	});
}

export async function getPaymentHistory(userId: string) {
	const items = await prisma.purchase.findMany({
		where: { userId, type: "subscription" },
		orderBy: { createdAt: "desc" },
	});

	const mapped = items.map((item) => ({
		id: item.id,
		type: item.type,
		plan: item.plan,
		provider: item.provider,
		method: item.method,
		amount: item.amount,
		status: item.status,
		createdAt: item.createdAt,
		expiresAt: item.expiresAt,
		transactionId: item.gatewayTransactionId,
	}));

	const activeSubscription = mapped.find((item) => item.status === "active") || null;
	return { activeSubscription, items: mapped };
}

export async function createSubscriptionCheckout(userId: string, rawPayload: any, idempotencyKey?: string | null) {
	const payload = rawPayload || {};
	const type = String(payload.type || "subscription");
	const requestedPlan = String(payload.plan || "monthly").toLowerCase();
	if (requestedPlan !== "monthly" && requestedPlan !== "yearly") {
		throw new AppError("plan must be monthly or yearly", 422, "VALIDATION_ERROR");
	}
	const plan: SubscriptionPlan = requestedPlan;
	const methodType = normalizeMethodType(String(payload.paymentMethod || payload.paymentMethodType || ""));
	const method: CheckoutMethod = CARD_METHODS.has(methodType) ? "card" : "wallet";
	const provider = normalizeProvider(String(payload.provider || (method === "wallet" ? methodType : "stripe")));
	const emailReceipt = Boolean(payload.emailReceipt ?? payload.sendConfirmationEmail ?? false);
	const currency = String(payload.currency || "USD").toUpperCase();
	if (type !== "subscription") {
		throw new AppError("type must be subscription", 422, "VALIDATION_ERROR");
	}

	const expectedAmount = SUBSCRIPTION_PRICE_CENTS[plan];
	if (payload.amount !== undefined) {
		const amountValue = Number(payload.amount);
		const normalizedAmount = amountValue < 100 ? Math.round(amountValue * 100) : Math.round(amountValue);
		if (normalizedAmount !== expectedAmount) {
			throw new AppError("Amount mismatch for selected plan", 422, "VALIDATION_ERROR", {
				expectedAmount,
				received: normalizedAmount,
			});
		}
	}

	if (method === "card") {
		if (!CARD_METHODS.has(methodType)) {
			throw new AppError("Invalid card payment method", 422, "VALIDATION_ERROR");
		}
	} else if (!WALLET_METHODS.has(methodType)) {
		throw new AppError("Invalid wallet payment method", 422, "VALIDATION_ERROR");
	}

	if (idempotencyKey) {
		const existing = await prisma.paymentCheckout.findUnique({
			where: {
				userId_idempotencyKey: {
					userId,
					idempotencyKey,
				},
			},
		});
			if (existing) {
			return {
				checkoutId: existing.checkoutId,
				status: existing.status,
				transactionId: existing.transactionId,
				paymentUrl: existing.paymentUrl,
				message: statusMessage(existing.status),
			};
		}
	}

	let cardToken: string | null = null;
	let cardLast4: string | null = null;
	let walletProvider: string | null = null;
	let walletNumberMasked: string | null = null;

	if (method === "card") {
		if (payload.card && payload.card.number) {
			const card = tokenizeCard(payload.card);
			cardToken = card.token;
			cardLast4 = card.last4;
		} else if (payload.cardLast4) {
			cardLast4 = String(payload.cardLast4);
			cardToken = `tok_${crypto.randomBytes(16).toString("hex")}`;
		} else {
			throw new AppError("Card information is required for card payments", 422, "VALIDATION_ERROR");
		}
		if (payload.wallet) {
			throw new AppError("wallet must be null for card payments", 422, "VALIDATION_ERROR");
		}
	} else {
		const wallet = payload.wallet || { provider: payload.paymentMethodType || payload.paymentMethod, number: payload.walletNumber };
		if (!wallet?.provider || !wallet?.number) {
			throw new AppError("wallet provider and number are required", 422, "VALIDATION_ERROR");
		}
		walletProvider = String(wallet.provider).toLowerCase();
		walletNumberMasked = maskWalletNumber(String(wallet.number));
		if (String(walletProvider) !== methodType) {
			throw new AppError("wallet.provider must match paymentMethod", 422, "VALIDATION_ERROR");
		}
		if (payload.card) {
			throw new AppError("card must be null for wallet payments", 422, "VALIDATION_ERROR");
		}
	}

	const checkoutId = `chk_${crypto.randomBytes(8).toString("hex")}`;
	const gateway = await createGatewaySession({
		checkoutId,
		amount: expectedAmount,
		currency,
		method,
		provider,
		paymentMethodType: methodType,
		userId,
		plan,
	});

	const checkout = await prisma.paymentCheckout.create({
		data: {
			checkoutId,
			transactionId: gateway.transactionId,
			userId,
			type: "subscription",
			plan,
			amount: expectedAmount,
			currency,
			provider,
			method,
			paymentMethodType: methodType,
			cardLast4,
			cardToken,
			walletProvider,
			walletNumberMasked,
			emailReceipt,
			idempotencyKey: idempotencyKey || null,
			status: gateway.status,
			paymentUrl: gateway.paymentUrl,
			gatewayRef: gateway.gatewayRef,
			metadata: {
				customer: payload.customer || null,
			},
		},
	});

	await writeAuditLog({
		checkoutId,
		transactionId: gateway.transactionId,
		source: "checkout-api",
		event: "CHECKOUT_CREATED",
		requestBody: {
			type,
			plan,
			method,
			paymentMethodType: methodType,
			provider,
		},
		responseBody: {
			checkoutId,
			transactionId: gateway.transactionId,
			status: checkout.status,
		},
		responseCode: 201,
	});

	if (checkout.status === "paid") {
		await ensureSubscriptionEntitlement({
			checkoutId: checkout.checkoutId,
			transactionId: checkout.transactionId,
			userId: checkout.userId,
			plan: checkout.plan,
			provider: checkout.provider,
			method: checkout.method,
			amount: checkout.amount,
			cardLast4: checkout.cardLast4,
			emailReceipt: checkout.emailReceipt,
			paidAt: checkout.paidAt,
		});
	}

	return {
		checkoutId: checkout.checkoutId,
		status: checkout.status,
		transactionId: checkout.transactionId,
		paymentUrl: checkout.paymentUrl,
		clientSecret: gateway.clientSecret,
		message: statusMessage(checkout.status),
	};
}

export async function getCheckoutStatus(userId: string, checkoutId: string) {
	const checkout = await prisma.paymentCheckout.findUnique({ where: { checkoutId } });
	if (!checkout || checkout.userId !== userId) {
		throw new AppError("Checkout not found", 404, "NOT_FOUND");
	}

	return {
		checkoutId: checkout.checkoutId,
		status: checkout.status,
		transactionId: checkout.transactionId,
		paidAt: checkout.paidAt,
		message: statusMessage(checkout.status),
	};
}

export async function handlePaymentWebhook(providerName: string, payload: any, signature?: string) {
	if (env.paymentWebhookSecret && signature && signature !== env.paymentWebhookSecret) {
		throw new AppError("Invalid webhook signature", 401, "INVALID_SIGNATURE");
	}

	const checkoutId = String(payload?.checkoutId || payload?.data?.checkoutId || "");
	const transactionId = String(payload?.transactionId || payload?.data?.transactionId || "");
	const rawStatus = String(payload?.status || payload?.data?.status || "").toLowerCase();

	if (!checkoutId && !transactionId) {
		throw new AppError("checkoutId or transactionId is required", 422, "VALIDATION_ERROR");
	}

	const status: PaymentCheckoutStatusValue = ["pending", "processing", "paid", "failed"].includes(rawStatus)
		? (rawStatus as PaymentCheckoutStatusValue)
		: "processing";

	const checkout = await prisma.paymentCheckout.findFirst({
		where: {
			OR: [
				{ checkoutId: checkoutId || undefined },
				{ transactionId: transactionId || undefined },
			],
		},
	});

	if (!checkout) {
		throw new AppError("Checkout not found", 404, "NOT_FOUND");
	}

	const updated = await prisma.paymentCheckout.update({
		where: { checkoutId: checkout.checkoutId },
		data: {
			status,
			paidAt: status === "paid" ? new Date() : checkout.paidAt,
			failedReason: status === "failed" ? String(payload?.reason || payload?.message || "Payment failed") : null,
			gatewayRef: String(payload?.gatewayRef || payload?.providerReference || checkout.gatewayRef || ""),
		},
	});

	await writeAuditLog({
		checkoutId: updated.checkoutId,
		transactionId: updated.transactionId,
		source: `${providerName}-webhook`,
		event: `STATUS_${String(status).toUpperCase()}`,
		requestBody: payload,
		responseBody: { updatedStatus: status },
		responseCode: 200,
	});

	if (status === "paid") {
		await ensureSubscriptionEntitlement({
			checkoutId: updated.checkoutId,
			transactionId: updated.transactionId,
			userId: updated.userId,
			plan: updated.plan,
			provider: updated.provider,
			method: updated.method,
			amount: updated.amount,
			cardLast4: updated.cardLast4,
			emailReceipt: updated.emailReceipt,
			paidAt: updated.paidAt,
		});
	}

	return {
		received: true,
		checkoutId: updated.checkoutId,
		status: updated.status,
		message: "Webhook processed",
	};
}

export async function getPurchaseHistory(userId: string) {
	const purchases = await prisma.purchase.findMany({
		where: { userId },
		include: { media: true },
		orderBy: { createdAt: "desc" },
	});
	return purchases.map((item) => ({
		id: item.id,
		type: item.type,
		plan: item.plan,
		mediaId: item.mediaId,
		mediaTitle: item.media?.title || null,
		provider: item.provider,
		method: item.method,
		amount: item.amount,
		status: item.status,
		transactionId: item.gatewayTransactionId,
		expiresAt: item.expiresAt,
		createdAt: item.createdAt,
	}));
}

export async function getAllPurchases() {
	return prisma.purchase.findMany({ include: { media: true, user: true }, orderBy: { createdAt: "desc" } });
}

export async function createPurchase(userId: string, payload: any, idempotencyKey?: string | null) {
	const type = String(payload?.type || "").toLowerCase();

	if (type === "subscription") {
		const checkout = await createSubscriptionCheckout(
			userId,
			{
				type: "subscription",
				plan: payload?.plan,
				amount: payload?.amount,
				currency: payload?.currency || "USD",
				paymentMethod: payload?.paymentMethodType || payload?.paymentMethod,
				emailReceipt: payload?.sendConfirmationEmail,
				provider: payload?.provider,
				cardLast4: payload?.cardLast4,
				walletNumber: payload?.walletNumber,
				wallet: payload?.walletNumber
					? {
						provider: payload?.paymentMethodType || payload?.paymentMethod,
						number: payload?.walletNumber,
					}
					: payload?.wallet || null,
				customer: payload?.customer || null,
			},
			idempotencyKey,
		);

		return {
			id: checkout.checkoutId,
			clientSecret: checkout.clientSecret,
			redirectUrl: checkout.paymentUrl,
			status: checkout.status,
			transactionId: checkout.transactionId,
			message: checkout.message,
		};
	}

	const { mediaId = null, plan = null, provider = "stripe", method = "card", cardLast4 = null, sendConfirmationEmail = false } = payload || {};
	const legacyType = type as "rent" | "buy";

	if (!["rent", "buy"].includes(type)) throw new AppError("Invalid purchase type", 422, "VALIDATION_ERROR");
	if (!["stripe", "paypal", "razorpay"].includes(String(provider)) || !["card", "wallet"].includes(String(method))) {
		throw new AppError("Invalid provider or method", 422, "VALIDATION_ERROR");
	}
	if (!mediaId) throw new AppError("mediaId is required for rent/buy", 422, "VALIDATION_ERROR");

	const media = await prisma.media.findUnique({ where: { id: mediaId } });
	if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");

	const purchase = await prisma.purchase.create({
		data: {
			userId,
			mediaId,
			type: legacyType,
			plan,
			provider,
			method,
			amount: calculateAmountCents(legacyType, plan),
			cardLast4,
			sendConfirmationEmail,
			status: "active",
			expiresAt: calculateExpiry(legacyType, plan),
		},
	});

	return {
		id: purchase.id,
		clientSecret: `pi_${crypto.randomBytes(12).toString("hex")}`,
		redirectUrl: `https://checkout.${provider}.com/pay/${purchase.id}`,
		status: "active",
		message: "Purchase created",
	};
}

export async function revokePurchase(purchaseId: string, userId: string, role: string) {
	const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
	if (!purchase) throw new AppError("Purchase not found", 404, "NOT_FOUND");
	if (purchase.userId !== userId && role !== "admin") throw new AppError("Forbidden", 403, "FORBIDDEN");

	const updated = await prisma.purchase.update({ where: { id: purchaseId }, data: { status: "revoked" } });
	return { success: true, refundAmount: updated.amount / 100 };
}
