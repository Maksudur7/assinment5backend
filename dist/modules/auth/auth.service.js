"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUpWithEmail = signUpWithEmail;
exports.signInWithEmail = signInWithEmail;
exports.socialSignIn = socialSignIn;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.getSessionUser = getSessionUser;
exports.getCurrentSession = getCurrentSession;
exports.listActiveSessions = listActiveSessions;
exports.revokeCurrentSession = revokeCurrentSession;
exports.refreshProviderToken = refreshProviderToken;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const better_auth_1 = require("../../lib/better-auth");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errors_1 = require("../../utils/errors");
async function signUpWithEmail(name, email, password) {
    const res = await better_auth_1.auth.api.signUpEmail({
        body: { name, email, password },
        asResponse: false,
    });
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user)
        throw new errors_1.AppError("USER_NOT_FOUND", 404, "USER_NOT_FOUND");
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: res.token || null,
    };
}
async function signInWithEmail(email, password) {
    const res = await better_auth_1.auth.api.signInEmail({
        body: { email, password },
        asResponse: false,
    });
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user)
        throw new errors_1.AppError("USER_NOT_FOUND", 404, "USER_NOT_FOUND");
    const token = res.token;
    if (!token) {
        throw new errors_1.AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
    };
}
async function socialSignIn(provider, idToken) {
    if (!["google", "github", "facebook"].includes(provider)) {
        throw new errors_1.AppError("Invalid provider", 422, "VALIDATION_ERROR");
    }
    const providerId = String(idToken).slice(0, 120);
    const pseudoEmail = `${providerId}@${provider}.ngv.social`;
    const pseudoPassword = crypto_1.default.randomBytes(16).toString("hex");
    let user = await prisma_1.default.user.findUnique({ where: { email: pseudoEmail } });
    if (!user) {
        const hash = await bcryptjs_1.default.hash(pseudoPassword, 10);
        user = await prisma_1.default.user.create({
            data: {
                name: `${provider}-user-${crypto_1.default.randomBytes(4).toString("hex")}`,
                email: pseudoEmail,
                passwordHash: hash,
            },
        });
    }
    const signin = await better_auth_1.auth.api.signInEmail({
        body: { email: pseudoEmail, password: pseudoPassword },
        asResponse: false,
    }).catch(async () => {
        const hash = await bcryptjs_1.default.hash(pseudoPassword, 10);
        await prisma_1.default.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
        return better_auth_1.auth.api.signInEmail({ body: { email: pseudoEmail, password: pseudoPassword }, asResponse: false });
    });
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: signin.token,
    };
}
async function forgotPassword(email) {
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (user) {
        const token = crypto_1.default.randomBytes(24).toString("hex");
        await prisma_1.default.passwordResetToken.create({
            data: {
                userId: user.id,
                token,
                expiresAt: new Date(Date.now() + 1000 * 60 * 30),
            },
        });
    }
    return { success: true, message: "Password reset email sent" };
}
async function resetPassword(token, newPassword) {
    const reset = await prisma_1.default.passwordResetToken.findUnique({ where: { token } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
        throw new errors_1.AppError("Invalid or expired reset token", 400, "VALIDATION_ERROR");
    }
    const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
    await prisma_1.default.$transaction([
        prisma_1.default.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
        prisma_1.default.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);
    return { success: true, message: "Password reset successful" };
}
async function getSessionUser(userId) {
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true },
    });
    if (!user)
        throw new errors_1.AppError("User not found", 404, "USER_NOT_FOUND");
    return { user };
}
async function getCurrentSession(headers) {
    return better_auth_1.auth.api.getSession({ headers, asResponse: false });
}
async function listActiveSessions(headers) {
    return better_auth_1.auth.api.listSessions({ headers, asResponse: false });
}
async function revokeCurrentSession(headers, token) {
    return better_auth_1.auth.api.revokeSession({
        headers,
        body: { token },
        asResponse: false,
    });
}
async function refreshProviderToken(headers, providerId, accountId, userId) {
    return better_auth_1.auth.api.refreshToken({
        headers,
        body: { providerId, ...(accountId ? { accountId } : {}), ...(userId ? { userId } : {}) },
        asResponse: false,
    });
}
