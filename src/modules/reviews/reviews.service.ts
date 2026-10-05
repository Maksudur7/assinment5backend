import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";

type Viewer = { id: string; role: string } | undefined;

type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: { user: { select: { id: true; name: true } }; likes: { select: { userId: true } } };
}>;

function toDto(item: ReviewWithRelations, viewerId?: string) {
  return {
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
    likedByMe: viewerId ? item.likes.some((l) => l.userId === viewerId) : false,
    createdAt: item.createdAt,
  };
}

const reviewInclude = {
  user: { select: { id: true, name: true } },
  likes: { select: { userId: true } },
} satisfies Prisma.ReviewInclude;

/**
 * Public: only published reviews. Signed-in users additionally see their OWN
 * unpublished review. Only admins may list everything (includePending).
 */
export async function listReviews(
  mediaId: string,
  limit: number,
  offset: number,
  includePending: boolean,
  viewer: Viewer,
) {
  const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { id: true } });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");

  const isAdmin = viewer?.role === "admin";
  const where: Prisma.ReviewWhereInput = {
    mediaId,
    ...(includePending && isAdmin
      ? {}
      : viewer
        ? { OR: [{ isPublished: true }, { userId: viewer.id }] }
        : { isPublished: true }),
  };

  const reviews = await prisma.review.findMany({
    where,
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
  });
  return reviews.map((r) => toDto(r, viewer?.id));
}

export async function createReview(
  mediaId: string,
  userId: string,
  payload: { rating: number; content: string; tags: string[]; spoiler: boolean },
) {
  const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { id: true } });
  if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");

  try {
    const review = await prisma.review.create({
      data: {
        mediaId,
        userId,
        rating: payload.rating,
        content: payload.content,
        tags: payload.tags,
        spoiler: payload.spoiler,
        // Reviews are auto-published; admins can unpublish/delete afterwards.
        isPublished: true,
        moderationStatus: "APPROVED",
      },
      include: reviewInclude,
    });
    return toDto(review, userId);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("You have already reviewed this title. Edit your existing review instead.", 409, "REVIEW_EXISTS");
    }
    throw error;
  }
}

export async function updateReview(
  reviewId: string,
  userId: string,
  payload: { rating?: number; content?: string; tags?: string[]; spoiler?: boolean },
) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
  if (review.userId !== userId) throw new AppError("Forbidden", 403, "FORBIDDEN");
  if (review.moderationStatus === "REJECTED") {
    throw new AppError("This review was removed by a moderator and can't be edited", 403, "REVIEW_REJECTED");
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...(payload.rating !== undefined ? { rating: payload.rating } : {}),
      ...(payload.content !== undefined ? { content: payload.content } : {}),
      ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
      ...(payload.spoiler !== undefined ? { spoiler: payload.spoiler } : {}),
    },
    include: reviewInclude,
  });
  return toDto(updated, userId);
}

export async function deleteReview(reviewId: string, userId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
  if (review.userId !== userId) throw new AppError("Forbidden", 403, "FORBIDDEN");

  await prisma.review.delete({ where: { id: reviewId } });
  return { success: true };
}

export async function toggleReviewLike(reviewId: string, userId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, isPublished: true } });
  if (!review || !review.isPublished) throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");

  const key = { reviewId_userId: { reviewId, userId } };
  const existing = await prisma.reviewLike.findUnique({ where: key });

  let isLiked: boolean;
  if (existing) {
    await prisma.reviewLike.deleteMany({ where: { reviewId, userId } });
    isLiked = false;
  } else {
    await prisma.reviewLike.upsert({ where: key, create: { reviewId, userId }, update: {} });
    isLiked = true;
  }

  const likes = await prisma.reviewLike.count({ where: { reviewId } });
  return { reviewId, likes, isLiked };
}

export async function addReviewComment(
  reviewId: string,
  userId: string,
  content: string,
  parentCommentId: string | null,
) {
  const review = await prisma.review.findUnique({ where: { id: reviewId }, select: { id: true, isPublished: true } });
  if (!review || !review.isPublished) throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");

  if (parentCommentId) {
    const parent = await prisma.reviewComment.findUnique({ where: { id: parentCommentId }, select: { reviewId: true } });
    if (!parent || parent.reviewId !== reviewId) {
      throw new AppError("Invalid parent comment", 422, "VALIDATION_ERROR");
    }
  }

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
    take: 500,
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
