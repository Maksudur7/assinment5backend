import { AppError } from "../utils/errors";
import prisma from "../lib/prisma";

function getApiKey(): string {
  const envKey = process.env.TMDB_API_KEY;
  if (!envKey || envKey === "15d2fb67176b4e0322f3614a06509f9f" || envKey.trim().length < 10) {
    return "4e44d9029b1270a757cddc766a1bcb63";
  }
  return envKey.trim();
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export interface TMDBSearchResult {
  id: number;
  title: string;
  original_title?: string;
  name?: string;
  media_type?: "movie" | "tv" | "person";
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
}

export async function searchTMDB(query: string, type: "movie" | "tv" | "multi" = "multi") {
  if (!query || !query.trim()) return [];

  const apiKey = getApiKey();
  const endpoint = `${TMDB_BASE_URL}/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query.trim())}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[TMDB Search Error]:", response.status, errorText);
    throw new AppError("Failed to fetch search results from TMDB", 502, "TMDB_FETCH_ERROR");
  }

  const data = (await response.json()) as { results: TMDBSearchResult[] };
  const filtered = (data.results || []).filter((item) => item.media_type !== "person");

  return filtered.map((item) => {
    const itemType = item.media_type === "tv" ? "tv" : type === "tv" ? "tv" : "movie";
    const title = item.title || item.name || "Untitled";
    const releaseDate = item.release_date || item.first_air_date || "";
    const year = releaseDate ? new Date(releaseDate).getFullYear() : new Date().getFullYear();
    const poster = item.poster_path
      ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}`
      : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60";

    return {
      tmdbId: item.id,
      title,
      type: itemType,
      synopsis: item.overview || "No overview available.",
      releaseYear: year,
      poster,
      rating: item.vote_average ? Number(item.vote_average.toFixed(1)) : 0,
      embedUrl:
        itemType === "tv"
          ? `https://player.autoembed.cc/embed/tv/${item.id}/1/1`
          : `https://player.autoembed.cc/embed/movie/${item.id}`,
    };
  });
}

export async function getTMDBDetails(tmdbId: number | string, rawType: "movie" | "tv" | "multi" = "movie") {
  const apiKey = getApiKey();
  let type: "movie" | "tv" = rawType === "tv" ? "tv" : "movie";
  let endpoint = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${apiKey}&append_to_response=credits`;
  let response = await fetch(endpoint);

  // If initial attempt with "movie" failed (404), try "tv"
  if (!response.ok && (rawType === "multi" || rawType === "movie")) {
    type = "tv";
    endpoint = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${apiKey}&append_to_response=credits`;
    response = await fetch(endpoint);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("[TMDB Details Error]:", response.status, errorText);
    throw new AppError("Failed to fetch media details from TMDB", 502, "TMDB_FETCH_ERROR");
  }

  const data = (await response.json()) as any;

  const title = data.title || data.name || "Untitled";
  const synopsis = data.overview || "No overview available.";
  const genres = Array.isArray(data.genres) ? data.genres.map((g: any) => g.name) : ["General"];
  const releaseDate = data.release_date || data.first_air_date || "";
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : new Date().getFullYear();

  // Extract director & cast
  let director = "Unknown";
  let cast: string[] = [];

  if (data.credits) {
    if (Array.isArray(data.credits.crew)) {
      const dirObj = data.credits.crew.find((c: any) => c.job === "Director" || c.job === "Executive Producer");
      if (dirObj) director = dirObj.name;
    }
    if (Array.isArray(data.credits.cast)) {
      cast = data.credits.cast.slice(0, 5).map((c: any) => c.name);
    }
  }

  if (cast.length === 0) cast = ["Cast Unavailable"];

  // Duration formatting
  let duration = "2h 00m";
  if (type === "movie" && data.runtime) {
    const hours = Math.floor(data.runtime / 60);
    const mins = data.runtime % 60;
    duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  } else if (type === "tv" && Array.isArray(data.episode_run_time) && data.episode_run_time.length > 0) {
    duration = `${data.episode_run_time[0]}m / Ep`;
  } else if (type === "tv" && data.number_of_seasons) {
    duration = `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? "s" : ""}`;
  }

  const poster = data.poster_path
    ? `${TMDB_IMAGE_BASE}/w500${data.poster_path}`
    : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=60";

  const streamingUrl =
    type === "tv"
      ? `https://player.autoembed.cc/embed/tv/${tmdbId}/1/1`
      : `https://player.autoembed.cc/embed/movie/${tmdbId}`;

  return {
    title,
    synopsis,
    genres: genres.length > 0 ? genres : ["Action", "Drama"],
    releaseYear,
    director,
    cast,
    platforms: ["NGV", "TMDB", type === "tv" ? "TV Series" : "Movie"],
    streamingUrl,
    poster,
    duration,
  };
}

export async function importTMDBToMedia(tmdbId: number | string, type: "movie" | "tv" | "multi" = "movie") {
  const payload = await getTMDBDetails(tmdbId, type);

  // Auto-ensure categories exist in DB for imported genres
  if (Array.isArray(payload.genres)) {
    for (const rawGenre of payload.genres) {
      let catName = rawGenre.trim();
      if (catName.includes("Action")) catName = "Action";
      else if (catName.includes("Sci") || catName.includes("Science")) catName = "Sci-Fi";
      else if (catName.includes("Animation")) catName = "Animation";
      else if (catName.includes("Comedy")) catName = "Comedy";
      else if (catName.includes("Drama")) catName = "Drama";
      else if (catName.includes("Horror")) catName = "Horror";
      else if (catName.includes("Thriller")) catName = "Thriller";

      if (catName) {
        await prisma.category.upsert({
          where: { name: catName },
          update: {},
          create: { name: catName, icon: "Film" },
        }).catch(() => {});
      }
    }
  }

  // Check if media with exact title or streamingUrl already exists
  const existing = await prisma.media.findFirst({
    where: {
      OR: [{ streamingUrl: payload.streamingUrl }, { title: payload.title }],
    },
  });

  if (existing) {
    // Update streamingUrl and return existing
    const updated = await prisma.media.update({
      where: { id: existing.id },
      data: payload,
    });
    return { media: updated, imported: false, message: "Media already existed and was updated." };
  }

  const created = await prisma.media.create({
    data: payload,
  });

  return { media: created, imported: true, message: "Media imported successfully from TMDB!" };
}

export async function autoSyncTrendingFromTMDB(limit = 12) {
  const apiKey = getApiKey();
  const endpoint = `${TMDB_BASE_URL}/trending/all/day?api_key=${apiKey}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new AppError("Failed to fetch trending titles from TMDB", 502, "TMDB_FETCH_ERROR");
  }

  const data = (await response.json()) as { results: TMDBSearchResult[] };
  const items = (data.results || []).filter((item) => item.media_type !== "person").slice(0, limit);

  let importedCount = 0;
  const results = [];

  for (const item of items) {
    const itemType = item.media_type === "tv" ? "tv" : "movie";
    try {
      const res = await importTMDBToMedia(item.id, itemType);
      if (res.imported) importedCount++;
      results.push(res);
    } catch {
      // skip error
    }
  }

  return {
    totalChecked: items.length,
    importedCount,
    message: `Auto-sync complete! ${importedCount} new trending titles imported into your library.`,
  };
}
