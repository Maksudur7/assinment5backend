import prisma from "../../lib/prisma";
import { addMediaMetrics } from "../../utils/media";

export async function listCategories() {
	return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function listCategoryVideos(categoryName: string) {
	const items = await prisma.media.findMany({
		where: {
			genres: { has: categoryName },
		},
		orderBy: { popularity: "desc" },
	});

	return addMediaMetrics(items);
}
