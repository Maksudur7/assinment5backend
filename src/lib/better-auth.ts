import prisma from "./prisma";
import { env } from "../config/env";
import {
  sendEmail,
  verificationEmailTemplate,
  passwordResetEmailTemplate,
} from "./email";

let authInstance: Promise<any> | null = null;

async function nativeImport<T>(specifier: string): Promise<T> {
  const importer = new Function("specifier", "return import(specifier);") as (
    specifier: string,
  ) => Promise<T>;
  return importer(specifier);
}

export async function getAuth() {
  if (!authInstance) {
    authInstance = (async () => {
      try {
        const { betterAuth } = await nativeImport<any>("better-auth");
        const { prismaAdapter } = await nativeImport<any>(
          "better-auth/adapters/prisma",
        );

        const socialProviders: Record<string, any> = {};

        // Only enable social providers if credentials are set
        if (env.googleClientId && env.googleClientSecret) {
          socialProviders.google = {
            clientId: env.googleClientId,
            clientSecret: env.googleClientSecret,
          };
        }
        if (env.githubClientId && env.githubClientSecret) {
          socialProviders.github = {
            clientId: env.githubClientId,
            clientSecret: env.githubClientSecret,
          };
        }
        if (env.facebookClientId && env.facebookClientSecret) {
          socialProviders.facebook = {
            clientId: env.facebookClientId,
            clientSecret: env.facebookClientSecret,
          };
        }
        return betterAuth({
          secret: env.betterAuthSecret,
          baseURL: env.betterAuthUrl,
          database: prismaAdapter(prisma, {
            provider: "postgresql",
          }),
          account: {
            skipStateCookieCheck: true,
          },

          // Email + Password auth with verification required
          emailAndPassword: {
            enabled: true,
            requireEmailVerification: true,
            sendResetPassword: async ({
              user,
              url,
            }: {
              user: { email: string; name: string };
              url: string;
            }) => {
              await sendEmail(
                user.email,
                "Reset your NGV password",
                passwordResetEmailTemplate(url),
              );
            },
          },

          // Email verification on signup
          emailVerification: {
            sendOnSignUp: true,
            autoSignInAfterVerification: true,
            sendVerificationEmail: async ({
              user,
              url,
            }: {
              user: { email: string; name: string };
              url: string;
            }) => {
              await sendEmail(
                user.email,
                "Verify your NGV account",
                verificationEmailTemplate(url),
              );
            },
          },

          // Social OAuth providers (only enabled if env vars set)
          ...(Object.keys(socialProviders).length > 0
            ? { socialProviders }
            : {}),

          // Security
          trustedOrigins: Array.from(
            new Set([env.appUrl, env.betterAuthUrl, ...env.frontendAppUrls]),
          ),

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
      } catch (e) {
        console.error("🔴 Better Auth Initialization Failed:", e);
        throw e;
      }
    })();
  }
  return authInstance;
}
