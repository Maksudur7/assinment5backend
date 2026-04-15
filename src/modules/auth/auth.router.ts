// import { Router } from "express";
// import { asyncHandler } from "../../utils/async-handler";
// import { authenticate } from "../../middleware/auth";
// import {
// 	emailSigninController,
// 	emailSignupController,
// 	forgotPasswordController,
// 	resetPasswordController,
// 	sessionController,
// 	sessionsController,
// 	refreshTokenController,
// 	revokeSessionController,
// 	signoutController,
// 	socialSigninController,
// } from "./auth.controller";

// const authRouter = Router();

// authRouter.post("/email/signup", asyncHandler(emailSignupController));
// authRouter.post("/email/signin", asyncHandler(emailSigninController));
// authRouter.post("/social/signin", asyncHandler(socialSigninController));
// authRouter.post("/forgot-password", asyncHandler(forgotPasswordController));
// authRouter.post("/reset-password", asyncHandler(resetPasswordController));
// authRouter.get("/session", authenticate, asyncHandler(sessionController));
// authRouter.get("/sessions", authenticate, asyncHandler(sessionsController));
// authRouter.post("/sessions/revoke", authenticate, asyncHandler(revokeSessionController));
// authRouter.post("/refresh-token", authenticate, asyncHandler(refreshTokenController));
// authRouter.post("/signout", asyncHandler(signoutController));

// export default authRouter;

import { Router } from "express";
import { getAuth } from "../../lib/better-auth";

const authRouter = Router();

// এখানে কোনো পাথ না দিয়ে সরাসরি মিডলওয়্যার হিসেবে ব্যবহার করুন
// এটি সব ধরণের সাব-পাথ (signin, signup, session) অটোমেটিক হ্যান্ডেল করবে
authRouter.use(async (req, res) => {
  try {
    const auth = await getAuth();
    const response = await auth.handler(req);
    return res.send(response);
  } catch (error) {
    console.error("❌ Better Auth Router Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default authRouter;
