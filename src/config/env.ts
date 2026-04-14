import dotenv from "dotenv";

dotenv.config({ override: true });

export const env = {
  port: Number(process.env.PORT || 4000),
  appUrl: process.env.APP_URL || "http://localhost:3000",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  betterAuthSecret: process.env.BETTER_AUTH_SECRET || "replace-with-strong-better-auth-secret",
  betterAuthUrl: process.env.BETTER_AUTH_URL || "http://localhost:4000",
};
