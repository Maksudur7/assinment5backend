"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubscriptionCheckoutController = createSubscriptionCheckoutController;
exports.checkoutStatusController = checkoutStatusController;
exports.paymentHistoryController = paymentHistoryController;
exports.paymentWebhookController = paymentWebhookController;
const errors_1 = require("../../utils/errors");
const purcheses_service_1 = require("../purchases/purcheses.service");
async function createSubscriptionCheckoutController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    const idempotencyKey = req.header("Idempotency-Key") || null;
    const result = await (0, purcheses_service_1.createSubscriptionCheckout)(req.user.id, req.body || {}, idempotencyKey);
    return res.status(201).json(result);
}
async function checkoutStatusController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    const checkoutId = String(req.params.checkoutId || "");
    return res.status(200).json(await (0, purcheses_service_1.getCheckoutStatus)(req.user.id, checkoutId));
}
async function paymentHistoryController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(200).json(await (0, purcheses_service_1.getPaymentHistory)(req.user.id));
}
async function paymentWebhookController(req, res) {
    const provider = String(req.params.provider || "generic");
    const signature = req.header("x-webhook-signature") || req.header("stripe-signature") || "";
    return res.status(200).json(await (0, purcheses_service_1.handlePaymentWebhook)(provider, req.body || {}, signature));
}
