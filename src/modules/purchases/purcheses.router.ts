import { Router } from "express";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
	allPurchasesController,
	createPurchaseController,
	purchaseHistoryController,
	revokePurchaseController,
} from "./purcheses.controller";

const purchasesRouter = Router();

purchasesRouter.get("/history", authenticate, asyncHandler(purchaseHistoryController));
purchasesRouter.get("/", authenticate, requireAdmin, asyncHandler(allPurchasesController));
purchasesRouter.post("/", authenticate, asyncHandler(createPurchaseController));
purchasesRouter.post("/:purchaseId/revoke", authenticate, asyncHandler(revokePurchaseController));

export default purchasesRouter;
