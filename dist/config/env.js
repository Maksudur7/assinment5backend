"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ override: true });
exports.env = {
    port: Number(process.env.PORT || 4000),
    appUrl: process.env.APP_URL || "http://localhost:3000",
    frontendAppUrl: process.env.FRONTEND_APP_URL || "https://ngv-black.vercel.app",
    stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
    paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || "",
    paymentTokenizationSecret: process.env.PAYMENT_TOKENIZATION_SECRET || process.env.BETTER_AUTH_SECRET || "replace-with-strong-tokenization-secret",
    betterAuthSecret: process.env.BETTER_AUTH_SECRET || "replace-with-strong-better-auth-secret",
    betterAuthUrl: process.env.BETTER_AUTH_URL || "http://localhost:4000",
};
