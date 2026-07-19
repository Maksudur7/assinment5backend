"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUpWithEmail = signUpWithEmail;
exports.signInWithEmail = signInWithEmail;
exports.getSessionUser = getSessionUser;
exports.getCurrentSession = getCurrentSession;
exports.listActiveSessions = listActiveSessions;
exports.revokeCurrentSession = revokeCurrentSession;
exports.revokeAllSessions = revokeAllSessions;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const errors_1 = require("../../utils/errors");
const better_auth_1 = require("../../lib/better-auth");
const email_1 = require("../../lib/email");
async function signUpWithEmail(name, email, password) {
    const auth = await (0, better_auth_1.getAuth)();
    await auth.api.signUpEmail({
        body: { name, email, password },
        asResponse: false,
    });
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user)
        throw new errors_1.AppError("USER_NOT_FOUND", 404, "USER_NOT_FOUND");
    // Send welcome email (non-blocking)
    (0, email_1.sendEmail)(email, "Welcome to NGV 🎬", (0, email_1.welcomeEmailTemplate)(name)).catch(() => { });
    // Note: Better Auth will automatically send the verification email.
    // User must verify before they can sign in (requireEmailVerification: true).
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        message: "Account created. Please check your email to verify your account before signing in.",
    };
}
async function signInWithEmail(email, password) {
    const auth = await (0, better_auth_1.getAuth)();
    const res = await auth.api.signInEmail({
        body: { email, password },
        asResponse: false,
    });
    if (!res) {
        throw new errors_1.AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user)
        throw new errors_1.AppError("USER_NOT_FOUND", 404, "USER_NOT_FOUND");
    const sessionToken = res?.session?.token || res?.token;
    if (!sessionToken) {
        throw new errors_1.AppError("Authentication failed", 401, "INVALID_CREDENTIALS");
    }
    // Update last login
    await prisma_1.default.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        token: sessionToken,
    };
}
async function getSessionUser(userId) {
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            emailVerified: true,
            image: true,
            createdAt: true,
            lastLoginAt: true,
        },
    });
    if (!user)
        throw new errors_1.AppError("User not found", 404, "USER_NOT_FOUND");
    return { user };
}
async function getCurrentSession(headers) {
    const auth = await (0, better_auth_1.getAuth)();
    return auth.api.getSession({ headers, asResponse: false });
}
async function listActiveSessions(headers) {
    const auth = await (0, better_auth_1.getAuth)();
    return auth.api.listSessions({ headers, asResponse: false });
}
async function revokeCurrentSession(headers, token) {
    const auth = await (0, better_auth_1.getAuth)();
    return auth.api.revokeSession({
        headers,
        body: { token },
        asResponse: false,
    });
}
async function revokeAllSessions(headers) {
    const auth = await (0, better_auth_1.getAuth)();
    return auth.api.revokeSessions({ headers, asResponse: false });
}
