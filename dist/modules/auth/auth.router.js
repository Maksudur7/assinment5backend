"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const async_handler_1 = require("../../utils/async-handler");
const auth_1 = require("../../middleware/auth");
const auth_controller_1 = require("./auth.controller");
const authRouter = (0, express_1.Router)();
// ── Registration & Login ────────────────────────────────────────────────────
authRouter.post("/email/signup", (0, async_handler_1.asyncHandler)(auth_controller_1.emailSignupController));
authRouter.post("/sign-up/email", (0, async_handler_1.asyncHandler)(auth_controller_1.emailSignupController)); // Better Auth compat alias
authRouter.post("/email/signin", (0, async_handler_1.asyncHandler)(auth_controller_1.emailSigninController));
authRouter.post("/sign-in/email", (0, async_handler_1.asyncHandler)(auth_controller_1.emailSigninController)); // Better Auth compat alias
// ── Sign Out ────────────────────────────────────────────────────────────────
authRouter.post("/sign-out", (0, async_handler_1.asyncHandler)(auth_controller_1.signoutController));
authRouter.post("/signout", (0, async_handler_1.asyncHandler)(auth_controller_1.signoutController));
// ── Session Management (requires auth) ─────────────────────────────────────
authRouter.get("/session", auth_1.authenticate, (0, async_handler_1.asyncHandler)(auth_controller_1.sessionController));
authRouter.get("/get-session", auth_1.authenticate, (0, async_handler_1.asyncHandler)(auth_controller_1.getSessionUserController));
authRouter.get("/sessions", auth_1.authenticate, (0, async_handler_1.asyncHandler)(auth_controller_1.sessionsController));
authRouter.post("/sessions/revoke", auth_1.authenticate, (0, async_handler_1.asyncHandler)(auth_controller_1.revokeSessionController));
authRouter.post("/sessions/revoke-all", auth_1.authenticate, (0, async_handler_1.asyncHandler)(auth_controller_1.revokeAllSessionsController));
// ── Profile User by ID (requires auth) ─────────────────────────────────────
authRouter.get("/user/:userId", auth_1.authenticate, (0, async_handler_1.asyncHandler)(auth_controller_1.getSessionUserController));
exports.default = authRouter;
