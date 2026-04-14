import dotenv from "dotenv";

dotenv.config({ override: true });

export const env = {
  port: Number(process.env.PORT || 4000),
  appUrl: process.env.APP_URL || "http://localhost:3000",
  frontendAppUrl: process.env.FRONTEND_APP_URL || "https://ngv-black.vercel.app",
  frontendAppUrls: (process.env.FRONTEND_APP_URLS || process.env.FRONTEND_APP_URL || "https://ngv-black.vercel.app")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || "",
  paymentTokenizationSecret: process.env.PAYMENT_TOKENIZATION_SECRET || process.env.BETTER_AUTH_SECRET || "replace-with-strong-tokenization-secret",
  betterAuthSecret: process.env.BETTER_AUTH_SECRET || "replace-with-strong-better-auth-secret",
  betterAuthUrl: process.env.BETTER_AUTH_URL || "http://localhost:4000",
};
