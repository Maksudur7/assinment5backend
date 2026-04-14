import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";

export async function listReviews(mediaId: string, limit: number, offset: number, includePending: boolean) {
  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");

  const reviews = await prisma.review.findMany({
    where: { mediaId, ...(includePending ? {} : { isPublished: true }) },
    include: { user: { select: { id: true, name: true } }, likes: true },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
  });

  return reviews.map((item) => ({
    id: item.id,
    mediaId: item.mediaId,
    userId: item.userId,
    userName: item.user.name,
    rating: item.rating,
    content: item.content,
    tags: item.tags,
    spoiler: item.spoiler,
    isPublished: item.isPublished,
    likes: item.likes.length,
    createdAt: item.createdAt,
  }));
}

export async function createReview(mediaId: string, userId: string, payload: { rating: number; content: string; tags?: string[]; spoiler?: boolean }) {
  if (payload.rating < 1 || payload.rating > 5) {
    throw new AppError("rating must be between 1 and 5", 422, "VALIDATION_ERROR");
  }

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");

  const review = await prisma.review.create({
    data: {
      mediaId,
      userId,
      rating: payload.rating,
      content: payload.content,
      tags: payload.tags || [],
      spoiler: payload.spoiler || false,
      isPublished: false,
      moderationStatus: "PENDING",
    },
    include: { user: { select: { name: true } }, likes: true },
  });

  return {
    id: review.id,
    mediaId: review.mediaId,
    userId: review.userId,
    userName: review.user.name,
    rating: review.rating,
    content: review.content,
    tags: review.tags,
    spoiler: review.spoiler,
    isPublished: review.isPublished,
    likes: review.likes.length,
    createdAt: review.createdAt,
  };
}

export async function updateReview(reviewId: string, userId: string, payload: { rating?: number; content?: string; tags?: string[]; spoiler?: boolean }) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
  if (review.userId !== userId) throw new AppError("Forbidden", 403, "FORBIDDEN");
  if (review.isPublished || review.moderationStatus !== "PENDING") {
    throw new AppError("Only unpublished pending reviews can be edited", 400, "VALIDATION_ERROR");
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...(payload.rating !== undefined ? { rating: payload.rating } : {}),
      ...(payload.content ? { content: payload.content } : {}),
      ...(payload.tags ? { tags: payload.tags } : {}),
      ...(typeof payload.spoiler === "boolean" ? { spoiler: payload.spoiler } : {}),
    },
    include: { user: { select: { name: true } }, likes: true },
  });

  return {
    id: updated.id,
    mediaId: updated.mediaId,
    userId: updated.userId,
    userName: updated.user.name,
    rating: updated.rating,
    content: updated.content,
    tags: updated.tags,
    spoiler: updated.spoiler,
    isPublished: updated.isPublished,
    likes: updated.likes.length,
    createdAt: updated.createdAt,
  };
}

export async function deleteReview(reviewId: string, userId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
  if (review.userId !== userId) throw new AppError("Forbidden", 403, "FORBIDDEN");
  if (review.isPublished || review.moderationStatus !== "PENDING") {
    throw new AppError("Only unpublished pending reviews can be deleted", 400, "VALIDATION_ERROR");
  }

  await prisma.review.delete({ where: { id: reviewId } });
  return { success: true };
}

export async function toggleReviewLike(reviewId: string, userId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");

  const existing = await prisma.reviewLike.findUnique({ where: { reviewId_userId: { reviewId, userId } } });

  let isLiked = false;
  if (existing) {
    await prisma.reviewLike.delete({ where: { reviewId_userId: { reviewId, userId } } });
  } else {
    await prisma.reviewLike.create({ data: { reviewId, userId } });
    isLiked = true;
  }

  const likes = await prisma.reviewLike.count({ where: { reviewId } });
  return { reviewId, likes, isLiked };
}

export async function addReviewComment(reviewId: string, userId: string, content: string, parentCommentId: string | null) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");

  const comment = await prisma.reviewComment.create({
    data: { reviewId, userId, content, parentCommentId },
    include: { user: { select: { name: true } } },
  });

  return {
    id: comment.id,
    reviewId: comment.reviewId,
    userId: comment.userId,
    userName: comment.user.name,
    content: comment.content,
    parentCommentId: comment.parentCommentId,
    createdAt: comment.createdAt,
  };
}

export async function listReviewComments(reviewId: string) {
  const comments = await prisma.reviewComment.findMany({
    where: { reviewId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return comments.map((comment) => ({
    id: comment.id,
    reviewId: comment.reviewId,
    userId: comment.userId,
    userName: comment.user.name,
    content: comment.content,
    parentCommentId: comment.parentCommentId,
    createdAt: comment.createdAt,
  }));
}
