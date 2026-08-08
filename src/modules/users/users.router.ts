import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import { getMeController, updateMeController, updateProgressController, watchHistoryController, updateAvatarController, continueWatchingController } from "./users.controller";

const usersRouter = Router();

usersRouter.get("/me", authenticate, asyncHandler(getMeController));
usersRouter.put("/me", authenticate, asyncHandler(updateMeController));
usersRouter.post("/me/avatar", authenticate, asyncHandler(updateAvatarController));
usersRouter.get("/me/watch-history", authenticate, asyncHandler(watchHistoryController));
usersRouter.get("/me/continue-watching", authenticate, asyncHandler(continueWatchingController));
usersRouter.put("/me/watch-progress/:mediaId", authenticate, asyncHandler(updateProgressController));

export default usersRouter;
