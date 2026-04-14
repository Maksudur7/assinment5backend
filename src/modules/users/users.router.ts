import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import { getMeController, updateMeController, updateProgressController, watchHistoryController } from "./users.controller";

const usersRouter = Router();

usersRouter.get("/me", authenticate, asyncHandler(getMeController));
usersRouter.put("/me", authenticate, asyncHandler(updateMeController));
usersRouter.get("/me/watch-history", authenticate, asyncHandler(watchHistoryController));
usersRouter.put("/me/watch-progress/:mediaId", authenticate, asyncHandler(updateProgressController));

export default usersRouter;
