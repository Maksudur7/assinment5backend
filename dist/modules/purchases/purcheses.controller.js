"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseHistoryController = purchaseHistoryController;
exports.allPurchasesController = allPurchasesController;
exports.createPurchaseController = createPurchaseController;
exports.revokePurchaseController = revokePurchaseController;
const errors_1 = require("../../utils/errors");
const purcheses_service_1 = require("./purcheses.service");
async function purchaseHistoryController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(200).json(await (0, purcheses_service_1.getPurchaseHistory)(req.user.id));
}
async function allPurchasesController(_req, res) {
    return res.status(200).json(await (0, purcheses_service_1.getAllPurchases)());
}
async function createPurchaseController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(201).json(await (0, purcheses_service_1.createPurchase)(req.user.id, req.body || {}));
}
async function revokePurchaseController(req, res) {
    if (!req.user)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(200).json(await (0, purcheses_service_1.revokePurchase)(String(req.params.purchaseId), req.user.id, req.user.role));
}
