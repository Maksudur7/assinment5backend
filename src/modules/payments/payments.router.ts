import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
  checkoutStatusController,
  createSubscriptionCheckoutController,
  paymentHistoryController,
  paymentWebhookController,
} from "./payments.controller";

const paymentsRouter = Router();

paymentsRouter.post("/checkout/subscription", authenticate, asyncHandler(createSubscriptionCheckoutController));
paymentsRouter.get("/checkout/:checkoutId/status", authenticate, asyncHandler(checkoutStatusController));
paymentsRouter.get("/history", authenticate, asyncHandler(paymentHistoryController));
paymentsRouter.post("/webhook/:provider", asyncHandler(paymentWebhookController));

export default paymentsRouter;
