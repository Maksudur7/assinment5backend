import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";

export async function getCurrentUser(userId: string) {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, name: true, email: true, role: true, image: true, passwordHash: true },
	});
	if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		image: user.image,
		hasPassword: !!user.passwordHash,
	};
}

export async function updateCurrentUser(userId: string, name?: string, email?: string) {
	if (!name && !email) throw new AppError("Nothing to update", 422, "VALIDATION_ERROR");

	if (email) {
		const duplicate = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
		if (duplicate) throw new AppError("Email already in use", 409, "VALIDATION_ERROR");
	}

	const user = await prisma.user.update({
		where: { id: userId },
		data: { ...(name ? { name } : {}), ...(email ? { email } : {}) },
		select: { id: true, name: true, email: true, role: true, image: true, passwordHash: true },
	});

	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		image: user.image,
		hasPassword: !!user.passwordHash,
	};
}

export async function listWatchHistory(userId: string, limit: number, offset: number) {
	const history = await prisma.watchHistory.findMany({
		where: { userId },
		include: { media: true },
		orderBy: { watchedAt: "desc" },
		skip: offset,
		take: limit,
	});

	// Get progress data for all watched media
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
	// Find all in-progress media (progress > 0, not fully watched)
	const progresses = await prisma.watchProgress.findMany({
		where: { userId, progressSeconds: { gt: 0 } },
		include: { media: true },
		orderBy: { updatedAt: "desc" },
		take: limit,
	});

	return progresses.map((p) => ({
		mediaId: p.mediaId,
		progressSeconds: p.progressSeconds,
		updatedAt: p.updatedAt,
		media: {
			id: p.media.id,
			title: p.media.title,
			synopsis: p.media.synopsis,
			poster: p.media.poster,
			duration: p.media.duration,
			genres: p.media.genres,
			releaseYear: p.media.releaseYear,
			director: p.media.director,
			cast: p.media.cast,
			platforms: p.media.platforms,
			streamingUrl: p.media.streamingUrl,
			avgRating: 0,
			totalReviews: 0,
		},
	}));
}

export async function updateWatchProgress(userId: string, mediaId: string, progressSeconds: number) {
	const media = await prisma.media.findUnique({ where: { id: mediaId } });
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
			data: { watchedAt: new Date() }
		});
	} else {
		await prisma.watchHistory.create({ data: { userId, mediaId, watchedAt: new Date() } });
	}

	return { mediaId, progressSeconds: progress.progressSeconds, updatedAt: progress.updatedAt };
}
