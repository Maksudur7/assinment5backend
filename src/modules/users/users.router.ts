import express, { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { strictRateLimit } from "../../middleware/rate-limit";
import { asyncHandler } from "../../utils/async-handler";
import { mediaIdParam, validate } from "../../utils/validate";
import {
  continueWatchingController,
  getMeController,
  historyQuery,
  progressBody,
  updateAvatarController,
  updateMeController,
  updateProfileBody,
  updateProgressController,
  watchHistoryController,
} from "./users.controller";

const usersRouter = Router();

const userWriteLimit = strictRateLimit({ scope: "user-write", windowMs: 60_000, max: 20 });

usersRouter.get("/me", authenticate, asyncHandler(getMeController));
usersRouter.put(
  "/me",
  authenticate,
  userWriteLimit,
  validate({ body: updateProfileBody }),
  asyncHandler(updateMeController),
);
// Avatar payload can be up to 3MB JSON
usersRouter.post(
  "/me/avatar",
  authenticate,
  userWriteLimit,
  express.json({ limit: "3mb" }),
  asyncHandler(updateAvatarController),
);
usersRouter.get("/me/watch-history", authenticate, validate({ query: historyQuery }), asyncHandler(watchHistoryController));
usersRouter.get("/me/continue-watching", authenticate, asyncHandler(continueWatchingController));
usersRouter.put(
  "/me/watch-progress/:mediaId",
  authenticate,
  validate({ params: mediaIdParam, body: progressBody }),
  asyncHandler(updateProgressController),
);

export default usersRouter;
