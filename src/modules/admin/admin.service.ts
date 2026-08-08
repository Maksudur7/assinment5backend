import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { addMediaMetrics } from "../../utils/media";

export async function listPendingComments() {
  try {
    const comments = await prisma.reviewComment.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: { user: true, review: { include: { media: true } } },
    });
    return comments.map((item) => ({
      id: item.id,
      reviewId: item.reviewId,
      userName: item.user?.name || "User",
      content: item.content,
      createdAt: item.createdAt,
      reviewTitle: item.review?.media?.title || "Movie",
    }));
  } catch (e) {
    return [];
  }
}

export async function getAdminOverview() {
  const [
    totalUsers,
    totalMedia,
    pendingReviews,
    hiddenComments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.media.count(),
    prisma.review.count(),
    prisma.reviewComment.count(),
  ]);

  return {
    totalUsers,
    totalMedia,
    pendingReviews,
    hiddenComments,
  };
}

export async function listPendingReviews() {
  const reviews = await prisma.review.findMany({
    take: 50,
    orderBy: { createdAt: "desc" },
    include: { user: true, media: true },
  });
  return reviews.map((item) => ({
    id: item.id,
    mediaTitle: item.media.title,
    userName: item.user.name,
    rating: item.rating,
    content: item.content,
    createdAt: item.createdAt,
    isPublished: item.isPublished,
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

export async function approveComment(commentId: string) {
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError("Comment not found", 404, "NOT_FOUND");
  return { success: true, commentId };
}

export async function rejectComment(commentId: string) {
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError("Comment not found", 404, "NOT_FOUND");
  await prisma.reviewComment.delete({ where: { id: commentId } });
  return { success: true, commentId };
}

export async function removeComment(commentId: string) {
  const comment = await prisma.reviewComment.findUnique({ where: { id: commentId } });
  if (!comment) throw new AppError("Comment not found", 404, "NOT_FOUND");
  await prisma.reviewComment.delete({ where: { id: commentId } });
  return { success: true, commentId };
}

export async function createCategory(payload: { name: string; icon?: string }) {
  if (!payload.name) {
    throw new AppError("Category name is required", 422, "VALIDATION_ERROR");
  }
  const existing = await prisma.category.findUnique({ where: { name: payload.name } });
  if (existing) {
    throw new AppError("Category already exists", 400, "CATEGORY_EXISTS");
  }
  return prisma.category.create({
    data: {
      name: payload.name,
      icon: payload.icon || "Film",
    },
  });
}

export async function deleteCategory(id: string) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Category not found", 404, "NOT_FOUND");
  }
  await prisma.category.delete({ where: { id } });
  return { success: true, message: "Category deleted" };
}

export async function listAllUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return users;
}

export async function updateUserRole(userId: string, role: string) {
  if (role !== "user" && role !== "admin") {
    throw new AppError("Invalid role", 400, "INVALID_ROLE");
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });
  return { success: true, user: updated };
}

