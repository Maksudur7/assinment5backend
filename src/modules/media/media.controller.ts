import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import {
  getMediaById,
  listFeatured,
  listMedia,
  listNewReleases,
  listRecommendations,
  listTrending,
  removeMedia,
  updateMedia,
  incrementView,
  decrementViewer,
  getViewStats,
  searchMedia,
  createMedia,
} from "./media.service";
import { generateWatchToken } from "../../lib/watch-token";

// Optimized SSE Subscription Manager
const subscriptions = new Map<string, Set<Response>>();

setInterval(async () => {
  for (const [mediaId, clients] of subscriptions.entries()) {
    if (clients.size > 0) {
       try {
         const stats = await getViewStats(mediaId);
         const payload = `data: ${JSON.stringify(stats)}\n\n`;
         for (const res of clients) res.write(payload);
       } catch (e) {
         console.error("SSE Poll error", e);
       }
    }
  }
}, 5000);

export async function streamViewerStatsController(req: Request, res: Response) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  
  const mediaId = String(req.params.id);
  
  if (!subscriptions.has(mediaId)) subscriptions.set(mediaId, new Set());
  subscriptions.get(mediaId)!.add(res);
  
  try {
    const initialStats = await getViewStats(mediaId);
    res.write(`data: ${JSON.stringify(initialStats)}\n\n`);
  } catch(e) {}
  
  req.on("close", () => {
    subscriptions.get(mediaId)?.delete(res);
  });
}
export async function incrementViewController(req: Request, res: Response) {
	const stats = await incrementView(String(req.params.id));
	return res.status(200).json(stats);
}

export async function decrementViewerController(req: Request, res: Response) {
	const stats = await decrementViewer(String(req.params.id));
	return res.status(200).json(stats);
}

export async function getViewStatsController(req: Request, res: Response) {
	const stats = await getViewStats(String(req.params.id));
	return res.status(200).json(stats);
}

export async function listMediaController(req: Request, res: Response) {
	return res.status(200).json(await listMedia(req.query as Record<string, unknown>));
}

export async function getMediaController(req: Request, res: Response) {
	return res.status(200).json(await getMediaById(String(req.params.id)));
}

export async function trendingController(req: Request, res: Response) {
	const limit = Number.parseInt(String(req.query.limit || 6), 10);
	return res.status(200).json(await listTrending(limit));
}

export async function featuredController(_req: Request, res: Response) {
	return res.status(200).json(await listFeatured());
}

export async function newReleasesController(req: Request, res: Response) {
	const limit = Number.parseInt(String(req.query.limit || 6), 10);
	return res.status(200).json(await listNewReleases(limit));
}

export async function recommendationsController(req: Request, res: Response) {
	if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json(await listRecommendations(req.user.id));
}

export async function updateMediaController(req: Request, res: Response) {
	return res.status(200).json(await updateMedia(String(req.params.id), req.body || {}));
}

export async function searchMediaController(req: Request, res: Response) {
  const q = String(req.query.q || "").trim();
  if (!q) return res.status(200).json([]);
  return res.status(200).json(await searchMedia(q));
}

export async function watchTokenController(req: Request, res: Response) {
  if (!req.user) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  const mediaId = String(req.params.id);
  const media = await getMediaById(mediaId);
  if (!media) throw new AppError("Not found", 404, "NOT_FOUND");
  const token = generateWatchToken(req.user.id, mediaId);
  return res.status(200).json({ token, expiresInSeconds: 15 * 60 });
}

export async function createMediaController(req: Request, res: Response) {
  return res.status(201).json(await createMedia(req.body || {}));
}

export async function deleteMediaController(req: Request, res: Response) {
  return res.status(200).json(await removeMedia(String(req.params.id)));
}
