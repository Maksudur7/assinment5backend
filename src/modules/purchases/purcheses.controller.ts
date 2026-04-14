import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import { createPurchase, getAllPurchases, getPurchaseHistory, revokePurchase } from "./purcheses.service";

export async function purchaseHistoryController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json(await getPurchaseHistory(req.user.id));
}

export async function allPurchasesController(_req: Request, res: Response) {
	return res.status(200).json(await getAllPurchases());
}

export async function createPurchaseController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	const idempotencyKey = req.header("Idempotency-Key") || null;
	return res.status(201).json(await createPurchase(req.user.id, req.body || {}, idempotencyKey));
}

export async function revokePurchaseController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json(await revokePurchase(String(req.params.purchaseId), req.user.id, req.user.role));
}
