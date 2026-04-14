import prisma from "../lib/prisma";

type MediaLike = { id: string } & Record<string, unknown>;

export async function addMediaMetrics<T extends MediaLike>(items: T[]) {
  if (!Array.isArray(items) || items.length === 0) {
    return [] as Array<T & { avgRating: number; totalReviews: number }>;
  }

  const mediaIds = items.map((item) => item.id);

  const grouped = await prisma.review.groupBy({
    by: ["mediaId"],
    where: { mediaId: { in: mediaIds }, isPublished: true },
    _count: { _all: true },
    _avg: { rating: true },
  });

  const metricsById = new Map(grouped.map((g) => [g.mediaId, g]));

  return items.map((item) => {
    const metric = metricsById.get(item.id);
    const totalReviews = metric?._count?._all || 0;
    const avgRatingRaw = metric?._avg?.rating || 0;

    return {
      ...item,
      avgRating: Number(Number(avgRatingRaw).toFixed(1)),
      totalReviews,
    };
  });
}
