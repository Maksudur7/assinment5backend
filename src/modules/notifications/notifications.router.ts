import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import {
  getNotificationsController,
  getUnreadCountController,
  markAsReadController,
  markAllAsReadController,
  broadcastController,
} from "./notifications.controller";

const notificationsRouter = Router();

notificationsRouter.get("/", authenticate, asyncHandler(getNotificationsController));
notificationsRouter.get("/unread-count", authenticate, asyncHandler(getUnreadCountController));
notificationsRouter.post("/:id/read", authenticate, asyncHandler(markAsReadController));
notificationsRouter.post("/read-all", authenticate, asyncHandler(markAllAsReadController));
notificationsRouter.post("/broadcast", authenticate, asyncHandler(broadcastController));

export default notificationsRouter;
