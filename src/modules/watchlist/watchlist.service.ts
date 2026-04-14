import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { addMediaMetrics } from "../../utils/media";

export async function getWatchlist(userId: string) {
	const items = await prisma.watchlistItem.findMany({
		where: { userId },
		include: { media: true },
		orderBy: { addedAt: "desc" },
	});

	const medias = await addMediaMetrics(items.map((item) => item.media));
	const byId = new Map(medias.map((m) => [m.id, m]));

	return items.map((item) => ({
		id: item.media.id,
		title: item.media.title,
		poster: item.media.poster,
		avgRating: byId.get(item.media.id)?.avgRating || 0,
		addedAt: item.addedAt,
	}));
}

export async function toggleWatchlist(userId: string, mediaId: string) {
	const media = await prisma.media.findUnique({ where: { id: mediaId } });
	if (!media) throw new AppError("Media not found", 404, "MEDIA_NOT_FOUND");

	const existing = await prisma.watchlistItem.findUnique({ where: { userId_mediaId: { userId, mediaId } } });

	if (existing) {
		await prisma.watchlistItem.delete({ where: { userId_mediaId: { userId, mediaId } } });
		return { mediaId, action: "removed" };
	}

	await prisma.watchlistItem.create({ data: { userId, mediaId } });
	return { mediaId, action: "added" };
}

export async function removeFromWatchlist(userId: string, mediaId: string) {
	await prisma.watchlistItem.deleteMany({ where: { userId, mediaId } });
	return { success: true };
}
