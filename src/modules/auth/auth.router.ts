import express, { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { authenticate } from "../../middleware/auth";
import { strictRateLimit } from "../../middleware/rate-limit";
import { validate } from "../../utils/validate";
import {
  revokeAllSessionsController,
  revokeBody,
  revokeSessionController,
  sessionController,
  sessionsController,
} from "./auth.controller";

const authRouter = Router();

// Brute-force protection for ALL credential endpoints handled by Better Auth
// (sign-in, sign-up, forgot/reset password, verification email...).
// 10 attempts / minute / IP, shared across serverless instances.
authRouter.use(
  strictRateLimit({
    scope: "auth",
    windowMs: 60_000,
    max: 10,
    methods: ["POST"],
    keyBy: (req) => req.ip,
  }),
);

// Session management for the signed-in user (sign-in/up/out, get-session,
// password reset etc. are served natively by Better Auth — see app.ts).
authRouter.get("/session", authenticate, asyncHandler(sessionController));
authRouter.get("/sessions", authenticate, asyncHandler(sessionsController));
authRouter.post(
  "/sessions/revoke",
  authenticate,
  express.json({ limit: "10kb" }),
  validate({ body: revokeBody }),
  asyncHandler(revokeSessionController),
);
authRouter.post("/sessions/revoke-all", authenticate, asyncHandler(revokeAllSessionsController));

export default authRouter;
