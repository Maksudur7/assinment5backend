import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { authenticate } from "../../middleware/auth";
import { toNodeHandler } from "better-auth/node";
import { getAuth } from "../../lib/better-auth";
import {
  emailSigninController,
  emailSignupController,
  getSessionUserController,
  sessionController,
  sessionsController,
  signoutController,
  revokeSessionController,
  revokeAllSessionsController,
} from "./auth.controller";

const authRouter = Router();

// Custom Session & User Management Routes (handled after Better Auth native routes)

// ── Session Management (requires auth) ─────────────────────────────────────
authRouter.get("/session", authenticate, asyncHandler(sessionController));
authRouter.get("/get-session", authenticate, asyncHandler(getSessionUserController));
authRouter.get("/sessions", authenticate, asyncHandler(sessionsController));
authRouter.post("/sessions/revoke", authenticate, asyncHandler(revokeSessionController));
authRouter.post("/sessions/revoke-all", authenticate, asyncHandler(revokeAllSessionsController));

// ── Profile User by ID (requires auth) ─────────────────────────────────────
authRouter.get("/user/:userId", authenticate, asyncHandler(getSessionUserController));

export default authRouter;
