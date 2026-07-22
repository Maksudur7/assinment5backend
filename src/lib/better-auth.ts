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

        // Only enable Google & Facebook social providers
        if (env.googleClientId && env.googleClientSecret) {
          socialProviders.google = {
            clientId: env.googleClientId,
            clientSecret: env.googleClientSecret,
            redirectURI: `${env.betterAuthUrl}/callback/google`,
          };
        }
        if (env.facebookClientId && env.facebookClientSecret) {
          socialProviders.facebook = {
            clientId: env.facebookClientId,
            clientSecret: env.facebookClientSecret,
            redirectURI: `${env.betterAuthUrl}/callback/facebook`,
          };
        }
        return betterAuth({
          secret: env.betterAuthSecret,
          baseURL: env.betterAuthUrl,
          database: prismaAdapter(prisma, {
            provider: "postgresql",
          }),
          user: {
            additionalFields: {
              role: {
                type: "string",
                defaultValue: "user",
                input: false,
              },
            },
          },
          account: {
            skipStateCookieCheck: true,
            storeStateStrategy: "cookie",
          },

          // Email + Password auth
          emailAndPassword: {
            enabled: true,
            requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
            sendResetPassword: async ({
              user,
              url,
              token,
            }: {
              user: { email: string; name: string };
              url: string;
              token?: string;
            }) => {
              const resetToken =
                token ||
                (url.includes("token=")
                  ? new URL(url).searchParams.get("token") || ""
                  : "");

              const resetUrl = resetToken
                ? `${env.frontendAppUrl}/reset-password?token=${encodeURIComponent(resetToken)}`
                : url;

              console.info(`[RESET LINK] ${user.email} -> ${resetUrl}`);

              await sendEmail(
                user.email,
                "Reset your NGV password 🔑",
                passwordResetEmailTemplate(resetUrl),
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
              token,
            }: {
              user: { email: string; name: string };
              url: string;
              token?: string;
            }) => {
              // Construct direct frontend verification URL
              const verificationToken =
                token ||
                (url.includes("token=")
                  ? new URL(url).searchParams.get("token") || ""
                  : "");

              const verificationUrl = verificationToken
                ? `${env.frontendAppUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`
                : url;

              console.info(`[VERIFICATION LINK] ${user.email} -> ${verificationUrl}`);

              await sendEmail(
                user.email,
                "Verify your NGV account 🎬",
                verificationEmailTemplate(verificationUrl),
              );
            },
          },

          // Social OAuth providers (Google and Facebook only)
          ...(Object.keys(socialProviders).length > 0
            ? { socialProviders }
            : {}),

          // Security
          trustedOrigins: Array.from(
            new Set([
              env.appUrl,
              env.betterAuthUrl,
              env.frontendAppUrl,
              ...env.frontendAppUrls,
              "https://ngv-black.vercel.app",
              "https://ngv-backend.vercel.app",
              "http://localhost:3000",
              "http://localhost:4000",
            ]),
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

          // Database hooks to sync legacy User fields with Better Auth schema
          databaseHooks: {
            user: {
              create: {
                after: async (user: any) => {
                  try {
                    const account = await prisma.account.findFirst({
                      where: { userId: user.id, providerId: "credential" },
                    });
                    if (account && account.password) {
                      await prisma.user.update({
                        where: { id: user.id },
                        data: { passwordHash: account.password },
                      });
                    }
                  } catch (err) {
                    console.error("Error in user create after hook:", err);
                  }
                },
              },
            },
            session: {
              create: {
                after: async (session: any) => {
                  try {
                    await prisma.user.update({
                      where: { id: session.userId },
                      data: { lastLoginAt: new Date() },
                    });
                  } catch (err) {
                    console.error("Error in session create after hook:", err);
                  }
                },
              },
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
