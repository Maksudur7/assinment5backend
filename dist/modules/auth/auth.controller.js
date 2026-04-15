"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailSignupController = emailSignupController;
exports.emailSigninController = emailSigninController;
exports.socialSigninController = socialSigninController;
exports.forgotPasswordController = forgotPasswordController;
exports.resetPasswordController = resetPasswordController;
exports.sessionController = sessionController;
exports.signoutController = signoutController;
exports.sessionsController = sessionsController;
exports.revokeSessionController = revokeSessionController;
exports.refreshTokenController = refreshTokenController;
const errors_1 = require("../../utils/errors");
const auth_service_1 = require("./auth.service");
async function emailSignupController(req, res) {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
        throw new errors_1.AppError("name, email, password required", 422, "VALIDATION_ERROR");
    }
    const user = await (0, auth_service_1.signUpWithEmail)(name, email, password);
    console.log('auth controller signup', user);
    return res.status(200).json(user);
}
async function emailSigninController(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) {
        throw new errors_1.AppError("email, password required", 422, "VALIDATION_ERROR");
    }
    const user = await (0, auth_service_1.signInWithEmail)(email, password);
    console.log('auth controller signin', user);
    return res.status(200).json(user);
}
async function socialSigninController(req, res) {
    const { provider, idToken } = req.body || {};
    if (!provider || !idToken) {
        throw new errors_1.AppError("provider, idToken required", 422, "VALIDATION_ERROR");
    }
    const user = await (0, auth_service_1.socialSignIn)(provider, idToken);
    console.log('auth controller social signin', user);
    return res.status(200).json(user);
}
async function forgotPasswordController(req, res) {
    const { email } = req.body || {};
    if (!email)
        throw new errors_1.AppError("email required", 422, "VALIDATION_ERROR");
    return res.status(200).json(await (0, auth_service_1.forgotPassword)(email));
}
async function resetPasswordController(req, res) {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
        throw new errors_1.AppError("token and newPassword required", 422, "VALIDATION_ERROR");
    }
    return res.status(200).json(await (0, auth_service_1.resetPassword)(token, newPassword));
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
        },
    });
}
async function signoutController(_req, res) {
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
    return res.status(200).json(await (0, auth_service_1.revokeCurrentSession)(new Headers(req.headers), String(token)));
}
async function refreshTokenController(req, res) {
    const { providerId, accountId, userId } = req.body || {};
    if (!providerId)
        throw new errors_1.AppError("providerId required", 422, "VALIDATION_ERROR");
    return res.status(200).json(await (0, auth_service_1.refreshProviderToken)(new Headers(req.headers), String(providerId), accountId ? String(accountId) : undefined, userId ? String(userId) : undefined));
}
