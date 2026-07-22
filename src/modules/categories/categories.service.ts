import prisma from "../../lib/prisma";
import { addMediaMetrics } from "../../utils/media";

export async function listCategories() {
	return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function listCategoryVideos(categoryName: string) {
	const items = await prisma.media.findMany({
		orderBy: { popularity: "desc" },
	});

	const target = categoryName.trim().toLowerCase();
	const matching = items.filter((item) =>
		Array.isArray(item.genres) &&
		item.genres.some((g) => String(g).trim().toLowerCase() === target)
	);

	return addMediaMetrics(matching);
}
