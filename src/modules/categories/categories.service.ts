import prisma from "../../lib/prisma";
import { addMediaMetrics } from "../../utils/media";

export async function listCategories() {
	return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function listCategoryVideos(categoryName: string) {
	const items = await prisma.media.findMany({
		orderBy: { createdAt: "desc" },
	});

	const target = categoryName.trim().toLowerCase();
	const targetClean = target.replace(/[-_&]/g, " ").replace(/\s+/g, " ");

	const matching = items.filter((item) => {
		if (!Array.isArray(item.genres)) return false;

		return item.genres.some((g) => {
			const genreStr = String(g).trim().toLowerCase();
			const genreClean = genreStr.replace(/[-_&]/g, " ").replace(/\s+/g, " ");

			// Exact match
			if (genreStr === target || genreClean === targetClean) return true;

			// Substring match
			if (genreClean.includes(targetClean) || targetClean.includes(genreClean)) return true;

			// Alias / Synonym mappings
			if (
				(targetClean.includes("sci fi") || targetClean.includes("science fiction")) &&
				(genreClean.includes("sci fi") || genreClean.includes("science fiction"))
			) {
				return true;
			}
			if (targetClean.includes("action") && genreClean.includes("action")) return true;
			if (targetClean.includes("drama") && genreClean.includes("drama")) return true;
			if (
				targetClean.includes("spider") &&
				(item.title.toLowerCase().includes("spider") || genreClean.includes("spider"))
			) {
				return true;
			}
			if (
				targetClean.includes("english") &&
				(genreClean.includes("english") || item.platforms.includes("NGV"))
			) {
				return true;
			}

			return false;
		});
	});

	return addMediaMetrics(matching);
}
