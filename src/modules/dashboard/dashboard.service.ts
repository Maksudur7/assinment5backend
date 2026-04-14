import prisma from "../../lib/prisma";
import { secondsToReadable } from "../../utils/time";
import { addMediaMetrics } from "../../utils/media";

export async function getDashboardStats(userId: string) {
	const [history, activeSub] = await Promise.all([
		prisma.watchHistory.findMany({ where: { userId } }),
		prisma.purchase.findFirst({
			where: {
				userId,
				type: "subscription",
				status: "active",
				OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
			},
			orderBy: { createdAt: "desc" },
		}),
	]);

	const totalSeconds = history.reduce((acc, item) => acc + item.progressSeconds, 0);

	return {
		totalWatchTime: secondsToReadable(totalSeconds),
		currentPlan: activeSub?.plan || "free",
		planExpiresAt: activeSub?.expiresAt || null,
	};
}

export async function getFavorites(userId: string) {
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
