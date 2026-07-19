import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { addMediaMetrics } from "../../utils/media";

export async function listPendingComments() {
  try {
    const comments = await prisma.reviewComment.findMany({
      where: { review: { moderationStatus: "PENDING" } },
      include: { user: true, review: { include: { media: true } } },
    });
    return comments.map((item) => ({
      id: item.id,
      reviewId: item.reviewId,
      userName: item.user?.name || "",
      content: item.content,
      createdAt: item.createdAt,
      reviewTitle: item.review?.media?.title || "",
    }));
  } catch (e) {
    // Table/field missing: return empty array to avoid crash
    return [];
  }
}

export async function getAdminOverview() {
  const [
    totalUsers,
    totalMedia,
    pendingReviews,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.media.count(),
    prisma.review.count({ where: { moderationStatus: "PENDING" } }),
  ]);

  return {
    totalUsers,
    totalMedia,
    pendingReviews,
  };
}

export async function listPendingReviews() {
  const reviews = await prisma.review.findMany({
    where: { moderationStatus: "PENDING" },
    include: { user: true, media: true },
  });
  return reviews.map((item) => ({
    id: item.id,
    mediaTitle: item.media.title,
    userName: item.user.name,
    rating: item.rating,
    content: item.content,
    createdAt: item.createdAt,
  }));
}

export async function approveReview(reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
  await prisma.review.update({
    where: { id: reviewId },
    data: { moderationStatus: "APPROVED", isPublished: true },
  });
  return { success: true, reviewId };
}

export async function rejectReview(reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
  await prisma.review.update({
    where: { id: reviewId },
    data: { moderationStatus: "REJECTED", isPublished: false },
  });
  return { success: true, reviewId };
}

export async function createMedia(payload: any) {
  const requiredFields = [
    "title",
    "synopsis",
    "genres",
    "releaseYear",
    "director",
    "cast",
    "platforms",
    "streamingUrl",
    "poster",
    "duration",
  ];

  for (const field of requiredFields) {
    if (payload?.[field] === undefined || payload?.[field] === null) {
      throw new AppError(`${field} is required`, 422, "VALIDATION_ERROR");
    }
  }

  const created = await prisma.media.create({ data: payload });
  const [enriched] = await addMediaMetrics([created]);
  return enriched;
}
