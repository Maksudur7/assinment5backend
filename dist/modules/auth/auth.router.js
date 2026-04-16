"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const async_handler_1 = require("../../utils/async-handler");
const auth_controller_1 = require("./auth.controller");
const authRouter = (0, express_1.Router)();
authRouter.post("/email/signup", (0, async_handler_1.asyncHandler)(auth_controller_1.emailSignupController));
authRouter.post("/sign-up/email", (0, async_handler_1.asyncHandler)(auth_controller_1.emailSignupController));
authRouter.post("/email/signin", (0, async_handler_1.asyncHandler)(auth_controller_1.emailSigninController));
authRouter.post("/social/signin", (0, async_handler_1.asyncHandler)(auth_controller_1.socialSigninController));
authRouter.post("/forgot-password", (0, async_handler_1.asyncHandler)(auth_controller_1.forgotPasswordController));
authRouter.post("/reset-password", (0, async_handler_1.asyncHandler)(auth_controller_1.resetPasswordController));
// authRouter.get("/session", authenticate, asyncHandler(sessionController));
// authRouter.get("/sessions", authenticate, asyncHandler(sessionsController));
// authRouter.post("/sessions/revoke", authenticate, asyncHandler(revokeSessionController));
// authRouter.post("/refresh-token", authenticate, asyncHandler(refreshTokenController));
// authRouter.post("/signout", asyncHandler(signoutController));
authRouter.post("/sign-in/email", (0, async_handler_1.asyncHandler)(auth_controller_1.emailSigninController));
authRouter.post("/sign-in/social", (0, async_handler_1.asyncHandler)(auth_controller_1.socialSigninController));
// Dummy sign-out route for frontend compatibility
authRouter.post("/sign-out", (req, res) => {
    // Optionally: req.session?.destroy(), res.clearCookie(), etc.
    res.json({ success: true });
});
// Dummy get-session route for frontend compatibility
authRouter.get("/get-session", (req, res) => {
    res.status(200).json({ user: null, session: null });
});
exports.default = authRouter;
