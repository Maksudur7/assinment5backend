"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentHistory = getPaymentHistory;
exports.createSubscriptionCheckout = createSubscriptionCheckout;
exports.getCheckoutStatus = getCheckoutStatus;
exports.handlePaymentWebhook = handlePaymentWebhook;
exports.getPurchaseHistory = getPurchaseHistory;
exports.getAllPurchases = getAllPurchases;
exports.createPurchase = createPurchase;
exports.revokePurchase = revokePurchase;
const crypto_1 = __importDefault(require("crypto"));
const stripe_1 = __importDefault(require("stripe"));
const prisma_1 = __importDefault(require("../../lib/prisma"));
const env_1 = require("../../config/env");
const errors_1 = require("../../utils/errors");
const stripeClient = env_1.env.stripeSecretKey ? new stripe_1.default(env_1.env.stripeSecretKey) : null;
const SUBSCRIPTION_PRICE_CENTS = {
    monthly: 999,
    yearly: 9999,
};
const CARD_METHODS = new Set(["visa", "debit_card", "credit_card"]);
const WALLET_METHODS = new Set(["bkash", "nagad", "rocket"]);
function calculateAmountCents(type, plan) {
    if (type === "rent")
        return 499;
    if (type === "buy")
        return 1299;
    if (type === "subscription") {
        if (plan !== "monthly" && plan !== "yearly") {
            throw new errors_1.AppError("Invalid subscription plan", 422, "VALIDATION_ERROR");
        }
        return SUBSCRIPTION_PRICE_CENTS[plan];
    }
    throw new errors_1.AppError("Invalid purchase type", 422, "VALIDATION_ERROR");
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
function normalizeMethodType(value) {
    const normalized = value.trim().toLowerCase();
    if (["visa", "debit_card", "credit_card", "bkash", "nagad", "rocket"].includes(normalized)) {
        return normalized;
    }
    throw new errors_1.AppError("Unsupported paymentMethod", 422, "VALIDATION_ERROR");
}
function normalizeProvider(value) {
    if (!value)
        return "stripe";
    const provider = value.trim().toLowerCase();
    if (["stripe", "sslcommerz", "portwallet", "bkash", "nagad", "rocket"].includes(provider)) {
        return provider;
    }
    throw new errors_1.AppError("Unsupported provider", 422, "VALIDATION_ERROR");
}
function maskWalletNumber(walletNumber) {
    const digits = walletNumber.replace(/\D/g, "");
    if (digits.length < 4)
        return "****";
    return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}
function tokenizeCard(card) {
    const cleanedNumber = String(card.number || "").replace(/\s+/g, "");
    if (!/^\d{13,19}$/.test(cleanedNumber)) {
        throw new errors_1.AppError("Invalid card number", 422, "VALIDATION_ERROR");
    }
    if (!/^\d{3,4}$/.test(String(card.cvv || ""))) {
        throw new errors_1.AppError("Invalid card CVV", 422, "VALIDATION_ERROR");
    }
    const digest = crypto_1.default
        .createHmac("sha256", env_1.env.paymentTokenizationSecret)
        .update(`${cleanedNumber}|${card.holder}|${card.expiry}|${Date.now()}`)
        .digest("hex");
    return {
        token: `tok_${digest}`,
        last4: cleanedNumber.slice(-4),
    };
}
function statusMessage(status) {
    if (status === "paid")
        return "Payment completed";
    if (status === "failed")
        return "Payment failed";
    if (status === "processing")
        return "Payment is processing";
    return "Checkout created";
}
function toJsonInput(value) {
    if (value === undefined)
        return undefined;
    return value;
}
async function writeAuditLog(data) {
    await prisma_1.default.paymentAuditLog.create({
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
async function createGatewaySession(params) {
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
    throw new errors_1.AppError("Payment gateway not implemented for this provider/method. No dummy data allowed.", 501, "NOT_IMPLEMENTED");
}
async function ensureSubscriptionEntitlement(checkout) {
    const plan = checkout.plan === "yearly" ? "yearly" : "monthly";
    const paidAt = checkout.paidAt || new Date();
    const expiresAt = calculateExpiry("subscription", plan);
    const latestActive = await prisma_1.default.purchase.findFirst({
        where: { userId: checkout.userId, type: "subscription", status: "active" },
        orderBy: { createdAt: "desc" },
    });
    if (latestActive) {
        await prisma_1.default.purchase.update({
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
    await prisma_1.default.purchase.create({
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
async function getPaymentHistory(userId) {
    const items = await prisma_1.default.purchase.findMany({
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
async function createSubscriptionCheckout(userId, rawPayload, idempotencyKey) {
    const payload = rawPayload || {};
    const type = String(payload.type || "subscription");
    const requestedPlan = String(payload.plan || "monthly").toLowerCase();
    if (requestedPlan !== "monthly" && requestedPlan !== "yearly") {
        throw new errors_1.AppError("plan must be monthly or yearly", 422, "VALIDATION_ERROR");
    }
    const plan = requestedPlan;
    const methodType = normalizeMethodType(String(payload.paymentMethod || payload.paymentMethodType || ""));
    const method = CARD_METHODS.has(methodType) ? "card" : "wallet";
    const provider = normalizeProvider(String(payload.provider || (method === "wallet" ? methodType : "stripe")));
    const emailReceipt = Boolean(payload.emailReceipt ?? payload.sendConfirmationEmail ?? false);
    const currency = String(payload.currency || "USD").toUpperCase();
    if (type !== "subscription") {
        throw new errors_1.AppError("type must be subscription", 422, "VALIDATION_ERROR");
    }
    const expectedAmount = SUBSCRIPTION_PRICE_CENTS[plan];
    if (payload.amount !== undefined) {
        const amountValue = Number(payload.amount);
        const normalizedAmount = amountValue < 100 ? Math.round(amountValue * 100) : Math.round(amountValue);
        if (normalizedAmount !== expectedAmount) {
            throw new errors_1.AppError("Amount mismatch for selected plan", 422, "VALIDATION_ERROR", {
                expectedAmount,
                received: normalizedAmount,
            });
        }
    }
    if (method === "card") {
        if (!CARD_METHODS.has(methodType)) {
            throw new errors_1.AppError("Invalid card payment method", 422, "VALIDATION_ERROR");
        }
    }
    else if (!WALLET_METHODS.has(methodType)) {
        throw new errors_1.AppError("Invalid wallet payment method", 422, "VALIDATION_ERROR");
    }
    if (idempotencyKey) {
        const existing = await prisma_1.default.paymentCheckout.findUnique({
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
    let cardToken = null;
    let cardLast4 = null;
    let walletProvider = null;
    let walletNumberMasked = null;
    if (method === "card") {
        if (payload.card && payload.card.number) {
            const card = tokenizeCard(payload.card);
            cardToken = card.token;
            cardLast4 = card.last4;
        }
        else if (payload.cardLast4) {
            cardLast4 = String(payload.cardLast4);
            cardToken = `tok_${crypto_1.default.randomBytes(16).toString("hex")}`;
        }
        else {
            throw new errors_1.AppError("Card information is required for card payments", 422, "VALIDATION_ERROR");
        }
        if (payload.wallet) {
            throw new errors_1.AppError("wallet must be null for card payments", 422, "VALIDATION_ERROR");
        }
    }
    else {
        const wallet = payload.wallet || { provider: payload.paymentMethodType || payload.paymentMethod, number: payload.walletNumber };
        if (!wallet?.provider || !wallet?.number) {
            throw new errors_1.AppError("wallet provider and number are required", 422, "VALIDATION_ERROR");
        }
        walletProvider = String(wallet.provider).toLowerCase();
        walletNumberMasked = maskWalletNumber(String(wallet.number));
        if (String(walletProvider) !== methodType) {
            throw new errors_1.AppError("wallet.provider must match paymentMethod", 422, "VALIDATION_ERROR");
        }
        if (payload.card) {
            throw new errors_1.AppError("card must be null for wallet payments", 422, "VALIDATION_ERROR");
        }
    }
    const checkoutId = `chk_${crypto_1.default.randomBytes(8).toString("hex")}`;
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
    const checkout = await prisma_1.default.paymentCheckout.create({
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
async function getCheckoutStatus(userId, checkoutId) {
    const checkout = await prisma_1.default.paymentCheckout.findUnique({ where: { checkoutId } });
    if (!checkout || checkout.userId !== userId) {
        throw new errors_1.AppError("Checkout not found", 404, "NOT_FOUND");
    }
    return {
        checkoutId: checkout.checkoutId,
        status: checkout.status,
        transactionId: checkout.transactionId,
        paidAt: checkout.paidAt,
        message: statusMessage(checkout.status),
    };
}
async function handlePaymentWebhook(providerName, payload, signature) {
    if (env_1.env.paymentWebhookSecret && signature && signature !== env_1.env.paymentWebhookSecret) {
        throw new errors_1.AppError("Invalid webhook signature", 401, "INVALID_SIGNATURE");
    }
    const checkoutId = String(payload?.checkoutId || payload?.data?.checkoutId || "");
    const transactionId = String(payload?.transactionId || payload?.data?.transactionId || "");
    const rawStatus = String(payload?.status || payload?.data?.status || "").toLowerCase();
    if (!checkoutId && !transactionId) {
        throw new errors_1.AppError("checkoutId or transactionId is required", 422, "VALIDATION_ERROR");
    }
    const status = ["pending", "processing", "paid", "failed"].includes(rawStatus)
        ? rawStatus
        : "processing";
    const checkout = await prisma_1.default.paymentCheckout.findFirst({
        where: {
            OR: [
                { checkoutId: checkoutId || undefined },
                { transactionId: transactionId || undefined },
            ],
        },
    });
    if (!checkout) {
        throw new errors_1.AppError("Checkout not found", 404, "NOT_FOUND");
    }
    const updated = await prisma_1.default.paymentCheckout.update({
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
async function getPurchaseHistory(userId) {
    const purchases = await prisma_1.default.purchase.findMany({
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
async function getAllPurchases() {
    return prisma_1.default.purchase.findMany({ include: { media: true, user: true }, orderBy: { createdAt: "desc" } });
}
async function createPurchase(userId, payload, idempotencyKey) {
    const type = String(payload?.type || "").toLowerCase();
    if (type === "subscription") {
        const checkout = await createSubscriptionCheckout(userId, {
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
        }, idempotencyKey);
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
    const legacyType = type;
    if (!["rent", "buy"].includes(type))
        throw new errors_1.AppError("Invalid purchase type", 422, "VALIDATION_ERROR");
    if (!["stripe", "paypal", "razorpay"].includes(String(provider)) || !["card", "wallet"].includes(String(method))) {
        throw new errors_1.AppError("Invalid provider or method", 422, "VALIDATION_ERROR");
    }
    if (!mediaId)
        throw new errors_1.AppError("mediaId is required for rent/buy", 422, "VALIDATION_ERROR");
    const media = await prisma_1.default.media.findUnique({ where: { id: mediaId } });
    if (!media)
        throw new errors_1.AppError("Media not found", 404, "MEDIA_NOT_FOUND");
    const purchase = await prisma_1.default.purchase.create({
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
        clientSecret: `pi_${crypto_1.default.randomBytes(12).toString("hex")}`,
        redirectUrl: `https://checkout.${provider}.com/pay/${purchase.id}`,
        status: "active",
        message: "Purchase created",
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
