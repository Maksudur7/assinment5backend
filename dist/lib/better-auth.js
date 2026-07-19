"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuth = getAuth;
const prisma_1 = __importDefault(require("./prisma"));
const env_1 = require("../config/env");
const email_1 = require("./email");
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
                const socialProviders = {};
                // Only enable social providers if credentials are set
                if (env_1.env.googleClientId && env_1.env.googleClientSecret) {
                    socialProviders.google = {
                        clientId: env_1.env.googleClientId,
                        clientSecret: env_1.env.googleClientSecret,
                    };
                }
                if (env_1.env.githubClientId && env_1.env.githubClientSecret) {
                    socialProviders.github = {
                        clientId: env_1.env.githubClientId,
                        clientSecret: env_1.env.githubClientSecret,
                    };
                }
                if (env_1.env.facebookClientId && env_1.env.facebookClientSecret) {
                    socialProviders.facebook = {
                        clientId: env_1.env.facebookClientId,
                        clientSecret: env_1.env.facebookClientSecret,
                    };
                }
                console.log("🔴 [DEBUG] socialProviders loaded:", Object.keys(socialProviders));
                return betterAuth({
                    secret: env_1.env.betterAuthSecret,
                    baseURL: env_1.env.betterAuthUrl,
                    database: prismaAdapter(prisma_1.default, {
                        provider: "postgresql",
                    }),
                    // Email + Password auth with verification required
                    emailAndPassword: {
                        enabled: true,
                        requireEmailVerification: true,
                        sendResetPassword: async ({ user, url, }) => {
                            await (0, email_1.sendEmail)(user.email, "Reset your NGV password", (0, email_1.passwordResetEmailTemplate)(url));
                        },
                    },
                    // Email verification on signup
                    emailVerification: {
                        sendOnSignUp: true,
                        autoSignInAfterVerification: true,
                        sendVerificationEmail: async ({ user, url, }) => {
                            await (0, email_1.sendEmail)(user.email, "Verify your NGV account", (0, email_1.verificationEmailTemplate)(url));
                        },
                    },
                    // Social OAuth providers (only enabled if env vars set)
                    ...(Object.keys(socialProviders).length > 0
                        ? { socialProviders }
                        : {}),
                    // Security
                    trustedOrigins: Array.from(new Set([env_1.env.appUrl, env_1.env.betterAuthUrl, ...env_1.env.frontendAppUrls])),
                    // Session config
                    session: {
                        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
                        updateAge: 24 * 60 * 60, // refresh if 1 day old
                        cookieCache: {
                            enabled: true,
                            maxAge: 5 * 60, // 5 minute cache
                        },
                    },
                });
            }
            catch (e) {
                console.error("🔴 Better Auth Initialization Failed:", e);
                throw e;
            }
        })();
    }
    return authInstance;
}
