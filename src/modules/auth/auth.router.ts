import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { authenticate } from "../../middleware/auth";
import {
  emailSigninController,
  emailSignupController,
  forgotPasswordController,
  resetPasswordController,
  // sessionController,
  // sessionsController,
  // refreshTokenController,
  // revokeSessionController,
  // signoutController,
  socialSigninController,
} from "./auth.controller";

const authRouter = Router();

authRouter.post("/email/signup", asyncHandler(emailSignupController));
authRouter.post("/sign-up/email", asyncHandler(emailSignupController));
authRouter.post("/email/signin", asyncHandler(emailSigninController));
authRouter.post("/social/signin", asyncHandler(socialSigninController));
authRouter.post("/forgot-password", asyncHandler(forgotPasswordController));
authRouter.post("/reset-password", asyncHandler(resetPasswordController));
// authRouter.get("/session", authenticate, asyncHandler(sessionController));
// authRouter.get("/sessions", authenticate, asyncHandler(sessionsController));
// authRouter.post("/sessions/revoke", authenticate, asyncHandler(revokeSessionController));
// authRouter.post("/refresh-token", authenticate, asyncHandler(refreshTokenController));
// authRouter.post("/signout", asyncHandler(signoutController));
authRouter.post("/sign-in/email", asyncHandler(emailSigninController));
authRouter.post("/sign-in/social", asyncHandler(socialSigninController));


// Dummy sign-out route for frontend compatibility
authRouter.post("/sign-out", (req, res) => {
  // Optionally: req.session?.destroy(), res.clearCookie(), etc.
  res.json({ success: true });
});

// Dummy get-session route for frontend compatibility
authRouter.get("/get-session", (req, res) => {
  res.status(200).json({ user: null, session: null });
});

export default authRouter;
