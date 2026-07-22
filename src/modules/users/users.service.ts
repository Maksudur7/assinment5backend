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

	return history.map((item) => ({
		mediaId: item.mediaId,
		title: item.media.title,
		poster: item.media.poster,
		watchedAt: item.watchedAt,
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
