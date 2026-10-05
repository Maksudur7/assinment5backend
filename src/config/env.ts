import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

/**
 * Required in production (throws on boot if missing).
 * In development a clearly-insecure placeholder is used so local setup is easy,
 * but a real secret is NEVER committed to source control.
 */
function requireEnv(key: string, devFallback: string): string {
  const value = process.env[key];
  if (value) return value;
  if (isProduction) {
    throw new Error(`[ENV] Missing required environment variable: ${key}`);
  }
  return devFallback;
}

function csv(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((v) => v.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const stripSlash = (v: string) => v.replace(/\/+$/, "");

const frontendUrls = csv(process.env.FRONTEND_APP_URLS || process.env.FRONTEND_APP_URL);
if (!isProduction && frontendUrls.length === 0) frontendUrls.push("http://localhost:3000");
if (isProduction && frontendUrls.length === 0) {
  throw new Error("[ENV] FRONTEND_APP_URL or FRONTEND_APP_URLS must be set in production");
}

const appUrl = stripSlash(
  process.env.APP_URL || (isProduction ? "" : "http://localhost:4000"),
);
if (isProduction && !appUrl) {
  throw new Error("[ENV] Missing required environment variable: APP_URL");
}

const rawAuthUrl = stripSlash(process.env.BETTER_AUTH_URL || appUrl);

export const env = {
  isProduction,
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",

  // App URLs
  appUrl,
  frontendAppUrl: frontendUrls[0],
  frontendAppUrls: frontendUrls,

  // Better Auth
  betterAuthSecret: requireEnv("BETTER_AUTH_SECRET", "dev-only-insecure-secret-change-me-32chars"),
  betterAuthUrl: rawAuthUrl.endsWith("/api/auth") ? rawAuthUrl : `${rawAuthUrl}/api/auth`,

  // Email — Resend & SMTP (Nodemailer)
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "NGV <onboarding@resend.dev>",
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: process.env.SMTP_SECURE !== "false",
  smtpUser: process.env.SMTP_USER || process.env.GMAIL_USER || "",
  smtpPass: process.env.SMTP_PASS || process.env.GMAIL_PASS || "",

  // Social OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  facebookClientId: process.env.FACEBOOK_CLIENT_ID || "",
  facebookClientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",

  // Watch token secret (for signed playback URLs)
  watchTokenSecret: requireEnv("WATCH_TOKEN_SECRET", "dev-only-insecure-watch-token-secret-32chars"),

  // Seed credentials (only used by `npm run seed`)
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || "admin@ngv.local",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || "",
  seedUserEmail: process.env.SEED_USER_EMAIL || "user@ngv.local",
  seedUserPassword: process.env.SEED_USER_PASSWORD || "",
};
