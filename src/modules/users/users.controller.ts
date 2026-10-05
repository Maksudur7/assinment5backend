import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { env } from "../../config/env";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { pagination } from "../../utils/validate";
import {
  getContinueWatching,
  getCurrentUser,
  listWatchHistory,
  updateCurrentUser,
  updateWatchProgress,
} from "./users.service";

export const updateProfileBody = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().max(100).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "Nothing to update" });

export const progressBody = z.object({
  progressSeconds: z.coerce.number().int().min(0).max(86400),
});

export const historyQuery = z.object(pagination(20, 50));

export async function getMeController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  return res.status(200).json(await getCurrentUser(req.user.id));
}

export async function updateMeController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const { name, email } = req.body;
  return res.status(200).json(await updateCurrentUser(req.user.id, name, email));
}

export async function watchHistoryController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const { limit, offset } = req.validatedQuery as { limit: number; offset: number };
  return res.status(200).json(await listWatchHistory(req.user.id, limit, offset));
}

export async function continueWatchingController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const { limit } = req.validatedQuery as { limit: number };
  return res.status(200).json(await getContinueWatching(req.user.id, limit));
}

export async function updateProgressController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const { progressSeconds } = req.body;
  return res
    .status(200)
    .json(await updateWatchProgress(req.user.id, req.params.mediaId as string, progressSeconds));
}

export async function updateAvatarController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const { image } = req.body || {};
  if (!image || typeof image !== "string") {
    throw new AppError("image payload required", 422, "VALIDATION_ERROR");
  }

  // Max 2MB base64 payload (~2.7MB string)
  if (image.length > 2_800_000) {
    throw new AppError("Avatar image must be under 2MB", 422, "VALIDATION_ERROR");
  }

  const matches = image.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/i);
  if (!matches) {
    throw new AppError("Invalid image format. Allowed: png, jpeg, webp, gif", 422, "VALIDATION_ERROR");
  }

  const ext = matches[1].toLowerCase() === "jpeg" ? "jpg" : matches[1].toLowerCase();
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  const uploadsDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const fileName = `avatar-${req.user.id}.${ext}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);

  const imageUrl = `${env.appUrl}/uploads/${fileName}?t=${Date.now()}`;
  await prisma.user.update({
    where: { id: req.user.id },
    data: { image: imageUrl },
  });

  return res.status(200).json({ success: true, image: imageUrl });
}
