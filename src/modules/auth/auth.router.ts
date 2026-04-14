import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { authenticate } from "../../middleware/auth";
import {
	emailSigninController,
	emailSignupController,
	forgotPasswordController,
	resetPasswordController,
	sessionController,
	sessionsController,
	refreshTokenController,
	revokeSessionController,
	signoutController,
	socialSigninController,
} from "./auth.controller";

const authRouter = Router();

authRouter.post("/email/signup", asyncHandler(emailSignupController));
authRouter.post("/email/signin", asyncHandler(emailSigninController));
authRouter.post("/social/signin", asyncHandler(socialSigninController));
authRouter.post("/forgot-password", asyncHandler(forgotPasswordController));
authRouter.post("/reset-password", asyncHandler(resetPasswordController));
authRouter.get("/session", authenticate, asyncHandler(sessionController));
authRouter.get("/sessions", authenticate, asyncHandler(sessionsController));
authRouter.post("/sessions/revoke", authenticate, asyncHandler(revokeSessionController));
authRouter.post("/refresh-token", authenticate, asyncHandler(refreshTokenController));
authRouter.post("/signout", asyncHandler(signoutController));

export default authRouter;
