export type CorsConfig = {
  /** Exact origins that are allowed (already normalized). */
  allowed: Set<string>;
  isProduction: boolean;
};

export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "").toLowerCase();
}

/**
 * Strict allow-list. No wildcard suffix matching and no substring checks
 * (previously `*.vercel.app` and anything containing "localhost" were accepted).
 * Localhost is only permitted outside production, and only as a real hostname.
 */
export function isOriginAllowed(origin: string | undefined, cfg: CorsConfig): boolean {
  if (!origin) return true; // same-origin / server-to-server / curl
  const normalized = normalizeOrigin(origin);
  if (cfg.allowed.has(normalized)) return true;

  if (!cfg.isProduction) {
    try {
      const { hostname } = new URL(normalized);
      return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    } catch {
      return false;
    }
  }
  return false;
}
