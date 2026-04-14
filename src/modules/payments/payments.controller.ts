import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import {
  createSubscriptionCheckout,
  getCheckoutStatus,
  getPaymentHistory,
  handlePaymentWebhook,
} from "../purchases/purcheses.service";

export async function createSubscriptionCheckoutController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const idempotencyKey = req.header("Idempotency-Key") || null;
  const result = await createSubscriptionCheckout(req.user.id, req.body || {}, idempotencyKey);
  return res.status(201).json(result);
}

export async function checkoutStatusController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const checkoutId = String(req.params.checkoutId || "");
  return res.status(200).json(await getCheckoutStatus(req.user.id, checkoutId));
}

export async function paymentHistoryController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  return res.status(200).json(await getPaymentHistory(req.user.id));
}

export async function paymentWebhookController(req: Request, res: Response) {
  const provider = String(req.params.provider || "generic");
  const signature = req.header("x-webhook-signature") || req.header("stripe-signature") || "";
  return res.status(200).json(await handlePaymentWebhook(provider, req.body || {}, signature));
}
