import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import {
  createMedia,
  getMediaById,
  getViewStats,
  leaveMedia,
  listFeatured,
  listMedia,
  listNewReleases,
  listRecommendations,
  listTrending,
  recordHeartbeat,
  removeMedia,
  sanitizeMedia,
  searchMedia,
  updateMedia,
  viewerKeyFor,
} from "./media.service";
import type { ListMediaQuery } from "./media.schema";
import { searchTMDB, importTMDBToMedia, autoSyncTrendingFromTMDB } from "../../services/tmdb.service";

/** Signed-in users may receive the playable URL; anonymous visitors never do. */
const canSeeStream = (req: Request) => Boolean(req.user);

const sanitizeList = <T extends Record<string, any>>(items: T[], req: Request) =>
  items.map((m) => sanitizeMedia(m, req.user?.role === "admin"));

export async function listMediaController(req: Request, res: Response) {
  const result = await listMedia(req.validatedQuery as ListMediaQuery);
  return res.status(200).json({ ...result, items: sanitizeList(result.items, req) });
}

export async function getMediaController(req: Request, res: Response) {
  const media = await getMediaById(req.params.id as string);
  return res.status(200).json(sanitizeMedia(media, canSeeStream(req)));
}

export async function trendingController(req: Request, res: Response) {
  const { limit } = req.validatedQuery as { limit: number };
  return res.status(200).json(sanitizeList(await listTrending(limit), req));
}

export async function featuredController(req: Request, res: Response) {
  return res.status(200).json(sanitizeList(await listFeatured(), req));
}

export async function newReleasesController(req: Request, res: Response) {
  const { limit } = req.validatedQuery as { limit: number };
  return res.status(200).json(sanitizeList(await listNewReleases(limit), req));
}

export async function recommendationsController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  return res.status(200).json(sanitizeList(await listRecommendations(req.user.id), req));
}

export async function searchMediaController(req: Request, res: Response) {
  const { q } = req.validatedQuery as { q: string };
  if (!q) return res.status(200).json([]);
  return res.status(200).json(sanitizeList(await searchMedia(q), req));
}

// ── Viewer presence ─────────────────────────────────────────────────────────
export async function heartbeatController(req: Request, res: Response) {
  const key = viewerKeyFor(req.user?.id, req.ip, req.headers["user-agent"]);
  return res.status(200).json(await recordHeartbeat(req.params.id as string, key));
}

export async function leaveController(req: Request, res: Response) {
  const key = viewerKeyFor(req.user?.id, req.ip, req.headers["user-agent"]);
  return res.status(200).json(await leaveMedia(req.params.id as string, key));
}

export async function getViewStatsController(req: Request, res: Response) {
  return res.status(200).json(await getViewStats(req.params.id as string));
}

// ── Admin ───────────────────────────────────────────────────────────────────
export async function createMediaController(req: Request, res: Response) {
  return res.status(201).json(await createMedia(req.body));
}

export async function updateMediaController(req: Request, res: Response) {
  return res.status(200).json(await updateMedia(req.params.id as string, req.body));
}

export async function deleteMediaController(req: Request, res: Response) {
  return res.status(200).json(await removeMedia(req.params.id as string));
}

// ── TMDB Integration ────────────────────────────────────────────────────────
export async function searchTMDBController(req: Request, res: Response) {
  const query = (req.query.query as string) || "";
  const type = (req.query.type as "movie" | "tv" | "multi") || "multi";
  if (!query.trim()) return res.status(200).json([]);
  const results = await searchTMDB(query, type);
  return res.status(200).json(results);
}

export async function importTMDBController(req: Request, res: Response) {
  const { tmdbId, type } = req.body;
  if (!tmdbId) throw new AppError("TMDB ID is required", 400, "MISSING_TMDB_ID");
  const result = await importTMDBToMedia(tmdbId, type || "movie");
  return res.status(201).json(result);
}

export async function autoSyncTMDBController(req: Request, res: Response) {
  const limit = req.body?.limit ? Number(req.body.limit) : 12;
  const result = await autoSyncTrendingFromTMDB(limit);
  return res.status(200).json(result);
}


