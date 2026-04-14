"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireAdmin = requireAdmin;
const prisma_1 = __importDefault(require("../lib/prisma"));
const errors_1 = require("../utils/errors");
async function authenticate(req, _res, next) {
    try {
        const authHeader = req.headers.authorization || "";
        const [scheme, token] = authHeader.split(" ");
        if (scheme !== "Bearer" || !token) {
            throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
        }
        const session = await prisma_1.default.session.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!session || session.expiresAt < new Date()) {
            throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
        }
        req.user = {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: session.user.role,
        };
        return next();
    }
    catch (error) {
        if (error instanceof errors_1.AppError) {
            return next(error);
        }
        return next(new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }
}
function requireAdmin(req, _res, next) {
    if (!req.user || req.user.role !== "admin") {
        return next(new errors_1.AppError("Forbidden", 403, "FORBIDDEN"));
    }
    return next();
}
