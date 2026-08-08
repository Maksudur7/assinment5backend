import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  broadcastNotification,
} from "./notifications.service";

export async function getNotificationsController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const limit = Number.parseInt(String(req.query.limit || 20), 10);
  const notifs = await getNotifications(req.user.id, limit);
  return res.status(200).json(notifs);
}

export async function getUnreadCountController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const count = await getUnreadCount(req.user.id);
  return res.status(200).json({ count });
}

export async function markAsReadController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  await markAsRead(req.user.id, req.params.id);
  return res.status(200).json({ ok: true });
}

export async function markAllAsReadController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  await markAllAsRead(req.user.id);
  return res.status(200).json({ ok: true });
}

export async function broadcastController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  if ((req.user as any).role !== "admin") throw new AppError("Admin only", 403, "FORBIDDEN");
  const { type = "system", title, message, link } = req.body;
  if (!title || !message) throw new AppError("title and message required", 422, "VALIDATION_ERROR");
  const result = await broadcastNotification({ type, title, message, link });
  return res.status(200).json(result);
}
