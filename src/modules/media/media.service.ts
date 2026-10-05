import { Prisma } from "@prisma/client";
import crypto from "crypto";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { addMediaMetrics } from "../../utils/media";
import type { ListMediaQuery } from "./media.schema";

const PRESENCE_WINDOW_MS = 45_000; // "watching now" = heartbeat within last 45s
const VIEW_COUNT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // one counted view / viewer / 6h

/**
 * The playable URL is only for signed-in users (and admins editing media).
 * Public listings/cards never include it.
 */
export function sanitizeMedia<T extends Record<string, any>>(item: T, includeStream: boolean) {
  if (includeStream) return item;
  const { streamingUrl: _omit, ...rest } = item;
  return rest as Omit<T, "streamingUrl">;
}

export async function listMedia(query: ListMediaQuery) {
  const { page, pageSize, search, genre, platform, releaseYear, minPopularity, minRating, maxRating, sort } = query;

  // Rating filter at DB level so pagination + totals stay correct.
  let ratingFilter: Prisma.MediaWhereInput = {};
  if (minRating > 0 || maxRating < 10) {
    const matching = await prisma.review.groupBy({
      by: ["mediaId"],
      where: { isPublished: true },
      _avg: { rating: true },
      having: { rating: { _avg: { gte: minRating, lte: maxRating } } },
    });
    const matchingIds = matching.map((m) => m.mediaId);

    if (minRating > 0) {
      ratingFilter = { id: { in: matchingIds } };
    } else {
      // min is 0: unrated titles count as 0, so only exclude rated ones above max
      const tooHigh = await prisma.review.groupBy({
        by: ["mediaId"],
        where: { isPublished: true },
        _avg: { rating: true },
        having: { rating: { _avg: { gt: maxRating } } },
      });
      ratingFilter = { id: { notIn: tooHigh.map((m) => m.mediaId) } };
    }
  }

  const where: Prisma.MediaWhereInput = {
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { synopsis: { contains: search, mode: "insensitive" } },
            { director: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(genre ? { genres: { has: genre } } : {}),
    ...(platform ? { platforms: { has: platform } } : {}),
    ...(releaseYear ? { releaseYear } : {}),
    ...(minPopularity ? { popularity: { gte: minPopularity } } : {}),
    ...ratingFilter,
  };

  const orderBy: Prisma.MediaOrderByWithRelationInput =
    sort === "popular" || sort === "rating"
      ? { popularity: "desc" }
      : sort === "year"
        ? { releaseYear: "desc" }
        : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.media.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.media.count({ where }),
  ]);

  return { items: await addMediaMetrics(items), total, page, pageSize };
}

export async function getMediaById(id: string) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
  const [enriched] = await addMediaMetrics([media]);
  return enriched;
}

export async function listTrending(limit: number) {
  return addMediaMetrics(await prisma.media.findMany({ orderBy: { popularity: "desc" }, take: limit }));
}

export async function listFeatured() {
  return addMediaMetrics(await prisma.media.findMany({ orderBy: { releaseYear: "desc" }, take: 6 }));
}

export async function listNewReleases(limit: number) {
  return addMediaMetrics(await prisma.media.findMany({ orderBy: { createdAt: "desc" }, take: limit }));
}

/** Recommends by genre frequency across watchlist + watch history, excluding already-saved titles. */
export async function listRecommendations(userId: string) {
  const [watchlist, history] = await Promise.all([
    prisma.watchlistItem.findMany({ where: { userId }, include: { media: { select: { id: true, genres: true } } }, take: 50 }),
    prisma.watchHistory.findMany({
      where: { userId },
      include: { media: { select: { id: true, genres: true } } },
      orderBy: { watchedAt: "desc" },
      take: 50,
    }),
  ]);

  const freq = new Map<string, number>();
  for (const entry of [...watchlist, ...history]) {
    for (const g of entry.media.genres) freq.set(g, (freq.get(g) || 0) + 1);
  }
  const topGenres = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([g]) => g);

  const excludeIds = watchlist.map((w) => w.media.id);

  const items = await prisma.media.findMany({
    where: {
      ...(topGenres.length ? { genres: { hasSome: topGenres } } : {}),
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    },
    orderBy: { popularity: "desc" },
    take: 12,
  });
  return addMediaMetrics(items);
}

export async function createMedia(payload: Prisma.MediaCreateInput) {
  const media = await prisma.media.create({ data: payload });
  const [enriched] = await addMediaMetrics([media]);
  return enriched;
}

export async function updateMedia(id: string, payload: Prisma.MediaUpdateInput) {
  const exists = await prisma.media.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
  const updated = await prisma.media.update({ where: { id }, data: payload });
  const [enriched] = await addMediaMetrics([updated]);
  return enriched;
}

export async function removeMedia(id: string) {
  const exists = await prisma.media.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
  await prisma.media.delete({ where: { id } });
  return { success: true, message: "Media deleted" };
}

export async function searchMedia(q: string) {
  const items = await prisma.media.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { synopsis: { contains: q, mode: "insensitive" } },
        { director: { contains: q, mode: "insensitive" } },
        { cast: { has: q } },
        { genres: { has: q } },
      ],
    },
    orderBy: { popularity: "desc" },
    take: 20,
  });
  return addMediaMetrics(items);
}

// ── Viewer presence (heartbeat based, safe on serverless) ───────────────────
export function viewerKeyFor(userId: string | undefined, ip: string | undefined, userAgent: string | undefined) {
  if (userId) return `u:${userId}`;
  const digest = crypto.createHash("sha256").update(`${ip || ""}|${userAgent || ""}`).digest("hex").slice(0, 24);
  return `a:${digest}`;
}

export async function getViewStats(mediaId: string) {
  const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { viewCount: true } });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
  const currentViewers = await prisma.mediaViewer.count({
    where: { mediaId, lastSeenAt: { gt: new Date(Date.now() - PRESENCE_WINDOW_MS) } },
  });
  return { viewCount: media.viewCount, currentViewers };
}

/** Called every ~20s by the player. Counts a view at most once per viewer per 6h. */
export async function recordHeartbeat(mediaId: string, viewerKey: string) {
  const exists = await prisma.media.findUnique({ where: { id: mediaId }, select: { id: true } });
  if (!exists) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");

  const now = new Date();
  const key = { mediaId_viewerKey: { mediaId, viewerKey } };
  const existing = await prisma.mediaViewer.findUnique({ where: key });
  const shouldCount = !existing || now.getTime() - existing.lastCountedAt.getTime() > VIEW_COUNT_COOLDOWN_MS;

  await prisma.mediaViewer.upsert({
    where: key,
    create: { mediaId, viewerKey },
    update: { lastSeenAt: now, ...(shouldCount ? { lastCountedAt: now } : {}) },
  });
  if (shouldCount) {
    await prisma.media.update({ where: { id: mediaId }, data: { viewCount: { increment: 1 } } });
  }

  // opportunistic cleanup of stale presence rows
  if (Math.random() < 0.02) {
    prisma.mediaViewer
      .deleteMany({ where: { lastSeenAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
      .catch(() => {});
  }

  return getViewStats(mediaId);
}

/** Marks the viewer as gone (keeps the row so the 6h view cooldown still applies). */
export async function leaveMedia(mediaId: string, viewerKey: string) {
  await prisma.mediaViewer.updateMany({ where: { mediaId, viewerKey }, data: { lastSeenAt: new Date(0) } });
  return getViewStats(mediaId);
}
