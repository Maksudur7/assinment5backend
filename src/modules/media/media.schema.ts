import { z } from "zod";

export const listMediaQuery = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(12),
    search: z.string().trim().max(100).optional(),
    genre: z.string().trim().max(50).optional(),
    platform: z.string().trim().max(50).optional(),
    releaseYear: z.coerce.number().int().min(1888).max(2200).optional(),
    minPopularity: z.coerce.number().int().min(0).optional(),
    minRating: z.coerce.number().min(0).max(10).default(0),
    maxRating: z.coerce.number().min(0).max(10).default(10),
    sort: z.preprocess(
      (val) => (val === "highest-rated" ? "rating" : val === "most-reviewed" ? "popular" : val),
      z.enum(["latest", "popular", "rating", "year"]).default("latest")
    ),
  })
  .refine((q) => q.minRating <= q.maxRating, {
    message: "minRating must be <= maxRating",
    path: ["minRating"],
  });
export type ListMediaQuery = z.infer<typeof listMediaQuery>;

export const limitQuery = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(6),
});

export const searchQuery = z.object({
  q: z.string().trim().max(100).default(""),
});
