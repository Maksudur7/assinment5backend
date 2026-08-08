import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import { getContinueWatching, getCurrentUser, listWatchHistory, updateCurrentUser, updateWatchProgress } from "./users.service";
import fs from "fs";
import path from "path";
import { env } from "../../config/env";
import prisma from "../../lib/prisma";

export async function getMeController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json(await getCurrentUser(req.user.id));
}

export async function updateMeController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	const { name, email } = req.body || {};
	return res.status(200).json(await updateCurrentUser(req.user.id, name, email));
}

export async function watchHistoryController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	const limit = Number.parseInt(String(req.query.limit || 20), 10);
	const offset = Number.parseInt(String(req.query.offset || 0), 10);
	return res.status(200).json(await listWatchHistory(req.user.id, limit, offset));
}

export async function continueWatchingController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	const limit = Number.parseInt(String(req.query.limit || 10), 10);
	return res.status(200).json(await getContinueWatching(req.user.id, limit));
}

export async function updateProgressController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	const progressSeconds = Number.parseInt(String(req.body?.progressSeconds), 10);
	if (Number.isNaN(progressSeconds) || progressSeconds < 0) {
		throw new AppError("progressSeconds must be a positive integer", 422, "VALIDATION_ERROR");
	}
	return res.status(200).json(await updateWatchProgress(req.user.id, String(req.params.mediaId), progressSeconds));
}

export async function updateAvatarController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const { image } = req.body || {};
  if (!image) throw new AppError("image payload required", 422, "VALIDATION_ERROR");

  if (!image.startsWith("data:image/")) {
    throw new AppError("Invalid image format, must be base64 data URL", 422, "VALIDATION_ERROR");
  }

  // 1. Extract base64 content
  const matches = image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new AppError("Invalid base64 image data", 422, "VALIDATION_ERROR");
  }

  const ext = matches[1]; // e.g. png, jpeg
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, "base64");

  // 2. Create directory public/uploads if not exists
  const uploadsDir = path.join(process.cwd(), "public/uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 3. Write file
  const fileName = `avatar-${req.user.id}.${ext}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);

  // 4. Update image URL in database
  const imageUrl = `${env.appUrl}/uploads/${fileName}?t=${Date.now()}`;
  await prisma.user.update({
    where: { id: req.user.id },
    data: { image: imageUrl },
  });

  return res.status(200).json({ success: true, image: imageUrl });
}
