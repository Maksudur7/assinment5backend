import dotenv from "dotenv";

dotenv.config({ override: true });

const isProduction = process.env.NODE_ENV === "production";

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value && isProduction) {
    throw new Error(`[ENV] Missing required environment variable: ${key}`);
  }
  return value || "";
}

const isLocal = !process.env.VERCEL && (process.env.NODE_ENV !== "production" || process.env.PORT === "4000" || !process.env.PORT);

const rawFrontendUrl = isLocal
  ? "http://localhost:3000"
  : (process.env.FRONTEND_APP_URL ||
     process.env.FRONTEND_APP_URLS ||
     "https://ngv-black.vercel.app");

const parsedFrontendUrls = rawFrontendUrl
  .split(",")
  .map((v) => v.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const primaryFrontendUrl = parsedFrontendUrls[0] || (isLocal ? "http://localhost:3000" : "https://ngv-black.vercel.app");

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "production",

  // App URLs
  appUrl: isLocal ? "http://localhost:4000" : (process.env.APP_URL || "https://ngv-backend.vercel.app").replace(/\/+$/, ""),
  frontendAppUrl: primaryFrontendUrl,
  frontendAppUrls: Array.from(
    new Set([
      ...parsedFrontendUrls,
      "https://ngv-black.vercel.app",
      "http://localhost:3000",
    ])
  ),

  // Better Auth
  betterAuthSecret: requireEnv("BETTER_AUTH_SECRET", "F2TUbwu1iD8UEYnpuP0SLScCwyyfF4e9"),
  betterAuthUrl: isLocal ? "http://localhost:4000" : (
    process.env.BETTER_AUTH_URL ||
    process.env.APP_URL ||
    "https://ngv-backend.vercel.app"
  ).replace(/\/+$/, ""),

  // Email — Resend
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "NGV <onboarding@resend.dev>",

  // Social OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  githubClientId: process.env.GITHUB_CLIENT_ID || "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || "",
  facebookClientId: process.env.FACEBOOK_CLIENT_ID || "",
  facebookClientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",

  // Watch token secret (for signed playback URLs)
  watchTokenSecret: requireEnv(
    "WATCH_TOKEN_SECRET",
    "replace-with-strong-watch-token-secret-32chars",
  ),
};

