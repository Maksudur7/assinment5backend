"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailSignupController = emailSignupController;
exports.emailSigninController = emailSigninController;
exports.getSessionUserController = getSessionUserController;
exports.sessionController = sessionController;
exports.signoutController = signoutController;
exports.sessionsController = sessionsController;
exports.revokeSessionController = revokeSessionController;
exports.revokeAllSessionsController = revokeAllSessionsController;
const errors_1 = require("../../utils/errors");
const auth_service_1 = require("./auth.service");
async function emailSignupController(req, res) {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
        throw new errors_1.AppError("name, email, password required", 422, "VALIDATION_ERROR");
    }
    const result = await (0, auth_service_1.signUpWithEmail)(name, email, password);
    return res.status(201).json(result);
}
async function emailSigninController(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
        throw new errors_1.AppError("email, password required", 422, "VALIDATION_ERROR");
    }
    const user = await (0, auth_service_1.signInWithEmail)(email, password);
    if (user.token) {
        res.cookie("token", user.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== "development",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
    }
    return res.status(200).json(user);
}
async function getSessionUserController(req, res) {
    const userId = req.params.userId || req.query.userId || req.user?.id;
    if (!userId)
        throw new errors_1.AppError("userId required", 400, "VALIDATION_ERROR");
    const result = await (0, auth_service_1.getSessionUser)(userId);
    return res.status(200).json(result);
}
async function sessionController(req, res) {
    const session = await (0, auth_service_1.getCurrentSession)(new Headers(req.headers));
    if (!session)
        throw new errors_1.AppError("Unauthorized", 401, "UNAUTHORIZED");
    return res.status(200).json({
        session: session.session,
        user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            role: session.user.role || "user",
            emailVerified: session.user.emailVerified,
        },
    });
}
async function signoutController(req, res) {
    res.clearCookie("token");
    return res.status(200).json({ success: true });
}
async function sessionsController(req, res) {
    const sessions = await (0, auth_service_1.listActiveSessions)(new Headers(req.headers));
    return res.status(200).json(sessions);
}
async function revokeSessionController(req, res) {
    const { token } = req.body || {};
    if (!token)
        throw new errors_1.AppError("token required", 422, "VALIDATION_ERROR");
    return res
        .status(200)
        .json(await (0, auth_service_1.revokeCurrentSession)(new Headers(req.headers), String(token)));
}
async function revokeAllSessionsController(req, res) {
    return res
        .status(200)
        .json(await (0, auth_service_1.revokeAllSessions)(new Headers(req.headers)));
}
