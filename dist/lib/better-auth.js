"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuth = getAuth;
const prisma_1 = __importDefault(require("./prisma"));
const env_1 = require("../config/env");
let authInstance = null;
async function nativeImport(specifier) {
    const importer = new Function("specifier", "return import(specifier);");
    return importer(specifier);
}
async function getAuth() {
    if (!authInstance) {
        authInstance = (async () => {
            try {
                const { betterAuth } = await nativeImport("better-auth");
                const { prismaAdapter } = await nativeImport("better-auth/adapters/prisma");
                console.log('🔎 [DEBUG] betterAuth baseURL:', env_1.env.betterAuthUrl);
                return betterAuth({
                    secret: env_1.env.betterAuthSecret || "a_very_long_secret_key_123", // নিশ্চিত করুন সিক্রেট আছে
                    baseURL: env_1.env.betterAuthUrl, // এটি কি http://localhost:4000/api/auth ?
                    database: prismaAdapter(prisma_1.default, {
                        provider: "postgresql",
                    }),
                    emailAndPassword: {
                        enabled: true,
                    },
                    trustedOrigins: Array.from(new Set([env_1.env.appUrl, env_1.env.betterAuthUrl, ...env_1.env.frontendAppUrls])),
                });
            }
            catch (e) {
                console.error("🔴 Better Auth Initialization Failed:", e); // এই লগটি দেখুন
                throw e;
            }
        })();
    }
    return authInstance;
}
