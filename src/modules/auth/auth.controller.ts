import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/errors";
import {
  getSessionUser,
  listActiveSessions,
  revokeOtherSessions,
  revokeSessionById,
} from "./auth.service";

export const revokeBody = z.object({ id: z.string().min(1).max(100) });

export async function sessionController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const { user } = await getSessionUser(req.user.id);
  return res.status(200).json({ session: req.session ?? null, user });
}

export async function sessionsController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  return res.status(200).json(await listActiveSessions(req.user.id, req.session?.id));
}

export async function revokeSessionController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  return res.status(200).json(await revokeSessionById(req.user.id, req.body.id));
}

export async function revokeAllSessionsController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  return res.status(200).json(await revokeOtherSessions(req.user.id, req.session?.id));
}
