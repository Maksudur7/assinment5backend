import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { addMediaMetrics } from "../../utils/media";

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      passwordHash: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
    emailVerified: user.emailVerified,
    hasPassword: Boolean(user.passwordHash),
    createdAt: user.createdAt,
  };
}

export async function updateCurrentUser(userId: string, name?: string, email?: string) {
  if (!name && !email) throw new AppError("Nothing to update", 422, "VALIDATION_ERROR");

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existsUser(existing)) throw new AppError("User not found", 404, "USER_NOT_FOUND");

  let isEmailChanged = false;
  if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
    const duplicate = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, NOT: { id: userId } },
    });
    if (duplicate) throw new AppError("Email already in use", 409, "VALIDATION_ERROR");
    isEmailChanged = true;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name ? { name } : {}),
      ...(email ? { email, emailVerified: isEmailChanged ? false : existing.emailVerified } : {}),
    },
    select: { id: true, name: true, email: true, role: true, image: true, passwordHash: true, emailVerified: true },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    image: user.image,
    emailVerified: user.emailVerified,
    hasPassword: Boolean(user.passwordHash),
  };
}

function existsUser(user: any): user is Record<string, any> {
  return Boolean(user);
}

export async function listWatchHistory(userId: string, limit: number, offset: number) {
  const history = await prisma.watchHistory.findMany({
    where: { userId },
    include: { media: true },
    orderBy: { watchedAt: "desc" },
    skip: offset,
    take: limit,
  });

  const mediaIds = history.map((h) => h.mediaId);
  const progresses = await prisma.watchProgress.findMany({
    where: { userId, mediaId: { in: mediaIds } },
  });
  const progressMap = new Map(progresses.map((p) => [p.mediaId, p.progressSeconds]));

  return history.map((item) => ({
    mediaId: item.mediaId,
    title: item.media.title,
    poster: item.media.poster,
    synopsis: item.media.synopsis,
    duration: item.media.duration,
    genres: item.media.genres,
    releaseYear: item.media.releaseYear,
    progressSeconds: progressMap.get(item.mediaId) || 0,
    watchedAt: item.watchedAt,
  }));
}

export async function getContinueWatching(userId: string, limit = 10) {
  const progresses = await prisma.watchProgress.findMany({
    where: { userId, progressSeconds: { gt: 0 } },
    include: { media: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const mediaList = await addMediaMetrics(progresses.map((p) => p.media));
  const mediaMap = new Map(mediaList.map((m) => [m.id, m]));

  return progresses.map((p) => {
    const enriched = mediaMap.get(p.media.id);
    return {
      mediaId: p.mediaId,
      progressSeconds: p.progressSeconds,
      updatedAt: p.updatedAt,
      media: enriched ? enriched : p.media,
    };
  });
}

export async function updateWatchProgress(userId: string, mediaId: string, progressSeconds: number) {
  const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { id: true } });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");

  const progress = await prisma.watchProgress.upsert({
    where: { userId_mediaId: { userId, mediaId } },
    create: { userId, mediaId, progressSeconds },
    update: { progressSeconds },
  });

  const existingHistory = await prisma.watchHistory.findFirst({ where: { userId, mediaId } });
  if (existingHistory) {
    await prisma.watchHistory.update({
      where: { id: existingHistory.id },
      data: { watchedAt: new Date() },
    });
  } else {
    await prisma.watchHistory.create({ data: { userId, mediaId, watchedAt: new Date() } });
  }

  return { mediaId, progressSeconds: progress.progressSeconds, updatedAt: progress.updatedAt };
}
