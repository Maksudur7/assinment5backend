import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { addMediaMetrics } from "../../utils/media";

function parseIntSafe(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseFloatSafe(value: unknown, fallback: number) {
  const parsed = Number.parseFloat(String(value));
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function listMedia(query: Record<string, unknown>) {
  const page = parseIntSafe(query.page, 1);
  const pageSize = parseIntSafe(query.pageSize, 12);
  const search = query.search ? String(query.search) : undefined;
  const genre = query.genre ? String(query.genre) : undefined;
  const platform = query.platform ? String(query.platform) : undefined;
  const releaseYear = query.releaseYear
    ? parseIntSafe(query.releaseYear, 0)
    : undefined;
  const minPopularity = query.minPopularity
    ? parseIntSafe(query.minPopularity, 0)
    : undefined;
  const minRating = query.minRating ? parseFloatSafe(query.minRating, 0) : 0;
  const maxRating = query.maxRating ? parseFloatSafe(query.maxRating, 10) : 10;
  const sort = query.sort ? String(query.sort) : "latest";

  const where = {
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { synopsis: { contains: search, mode: "insensitive" as const } },
            { director: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(genre ? { genres: { has: genre } } : {}),
    ...(platform ? { platforms: { has: platform } } : {}),
    ...(releaseYear ? { releaseYear } : {}),
    ...(minPopularity ? { popularity: { gte: minPopularity } } : {}),
  };

  const orderBy =
    sort === "latest"
      ? { createdAt: "desc" as const }
      : { popularity: "desc" as const };

  const [items, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.media.count({ where }),
  ]);

  const enriched = await addMediaMetrics(items);
  const filtered = enriched.filter(
    (item) => item.avgRating >= minRating && item.avgRating <= maxRating,
  );

  return { items: filtered, total: filtered.length || total, page, pageSize };
}

export async function getMediaById(id: string) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
  const [enriched] = await addMediaMetrics([media]);
  return enriched;
}

export async function listTrending(limit: number) {
  return addMediaMetrics(
    await prisma.media.findMany({
      orderBy: { popularity: "desc" },
      take: limit,
    }),
  );
}

export async function listFeatured() {
  return addMediaMetrics(
    await prisma.media.findMany({ orderBy: { releaseYear: "desc" }, take: 6 }),
  );
}

export async function listNewReleases(limit: number) {
  return addMediaMetrics(
    await prisma.media.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  );
}

export async function listRecommendations(userId: string) {
  const watchlist = await prisma.watchlistItem.findMany({
    where: { userId },
    include: { media: true },
    take: 20,
  });
  const topGenres = watchlist.flatMap((w) => w.media.genres).slice(0, 3);
  const items = await prisma.media.findMany({
    where: topGenres.length ? { genres: { hasSome: topGenres } } : undefined,
    orderBy: { popularity: "desc" },
    take: 12,
  });
  return addMediaMetrics(items);
}

export async function updateMedia(
  id: string,
  payload: Record<string, unknown>,
) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
  const updated = await prisma.media.update({ where: { id }, data: payload });
  const [enriched] = await addMediaMetrics([updated]);
  return enriched;
}

export async function removeMedia(id: string) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
  await prisma.media.delete({ where: { id } });
  return { success: true, message: "Media deleted" };
}

// Real-time view/user count logic
export async function incrementView(mediaId: string) {
  // Increment both viewCount and currentViewers
  const updated = await prisma.media.update({
    where: { id: mediaId },
    data: {
      viewCount: { increment: 1 },
      currentViewers: { increment: 1 },
    },
    select: { viewCount: true, currentViewers: true },
  });
  return updated;
}

export async function decrementViewer(mediaId: string) {
  // Decrement currentViewers (not below 0)
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { currentViewers: true },
  });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
  const newCount = Math.max(0, media.currentViewers - 1);
  const updated = await prisma.media.update({
    where: { id: mediaId },
    data: { currentViewers: newCount },
    select: { viewCount: true, currentViewers: true },
  });
  return updated;
}

export async function getViewStats(mediaId: string) {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { viewCount: true, currentViewers: true },
  });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");
  return media;
}
