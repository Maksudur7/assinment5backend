"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCategories = listCategories;
exports.listCategoryVideos = listCategoryVideos;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const media_1 = require("../../utils/media");
async function listCategories() {
    return prisma_1.default.category.findMany({ orderBy: { name: "asc" } });
}
async function listCategoryVideos(categoryName) {
    const items = await prisma_1.default.media.findMany({
        where: {
            genres: { has: categoryName },
        },
        orderBy: { popularity: "desc" },
    });
    return (0, media_1.addMediaMetrics)(items);
}
