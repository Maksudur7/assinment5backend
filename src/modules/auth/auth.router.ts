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

// ── Registration & Login ────────────────────────────────────────────────────
authRouter.post("/email/signup", asyncHandler(emailSignupController));
authRouter.post("/sign-up/email", asyncHandler(emailSignupController));  // Better Auth compat alias
authRouter.post("/signup/email", asyncHandler(emailSignupController));   // Better Auth compat alias

authRouter.post("/email/signin", asyncHandler(emailSigninController));
authRouter.post("/sign-in/email", asyncHandler(emailSigninController));   // Better Auth compat alias
authRouter.post("/signin/email", asyncHandler(emailSigninController));    // Better Auth compat alias

// ── Sign Out ────────────────────────────────────────────────────────────────
authRouter.post("/sign-out", asyncHandler(signoutController));
authRouter.post("/signout", asyncHandler(signoutController));

// ── Session Management (requires auth) ─────────────────────────────────────
authRouter.get("/session", authenticate, asyncHandler(sessionController));
authRouter.get("/get-session", authenticate, asyncHandler(getSessionUserController));
authRouter.get("/sessions", authenticate, asyncHandler(sessionsController));
authRouter.post("/sessions/revoke", authenticate, asyncHandler(revokeSessionController));
authRouter.post("/sessions/revoke-all", authenticate, asyncHandler(revokeAllSessionsController));

// ── Profile User by ID (requires auth) ─────────────────────────────────────
authRouter.get("/user/:userId", authenticate, asyncHandler(getSessionUserController));

export default authRouter;
