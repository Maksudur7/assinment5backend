import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { authenticate } from "../../middleware/auth";
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

// Custom high-performance endpoints for credential auth
authRouter.post("/sign-in/email", asyncHandler(emailSigninController));
authRouter.post("/sign-up/email", asyncHandler(emailSignupController));
authRouter.post("/sign-out", asyncHandler(signoutController));

// Session & User management
authRouter.get("/session", authenticate, asyncHandler(sessionController));
authRouter.get("/get-session", authenticate, asyncHandler(getSessionUserController));
authRouter.get("/sessions", authenticate, asyncHandler(sessionsController));
authRouter.post("/sessions/revoke", authenticate, asyncHandler(revokeSessionController));
authRouter.post("/sessions/revoke-all", authenticate, asyncHandler(revokeAllSessionsController));

authRouter.get("/user/:userId", authenticate, asyncHandler(getSessionUserController));

export default authRouter;
