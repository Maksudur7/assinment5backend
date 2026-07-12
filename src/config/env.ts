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

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",

  // App URLs
  appUrl: process.env.APP_URL || "http://localhost:4000",
  frontendAppUrl: process.env.FRONTEND_APP_URL || "http://localhost:3000",
  frontendAppUrls: (
    process.env.FRONTEND_APP_URLS ||
    process.env.FRONTEND_APP_URL ||
    "http://localhost:3000"
  )
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),

  // Better Auth
  betterAuthSecret: requireEnv("BETTER_AUTH_SECRET"),
  betterAuthUrl: process.env.BETTER_AUTH_URL || "http://localhost:4000",

  // Email — Resend
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "NGV <noreply@ngv.local>",

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
