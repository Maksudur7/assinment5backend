import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { env } from "../config/env";
import { nativeImport } from "./native-import";
import {
  sendEmail,
  verificationEmailTemplate,
  passwordResetEmailTemplate,
  welcomeEmailTemplate,
} from "./email";

let authInstance: Promise<any> | null = null;

function extractToken(token: string | undefined, url: string): string {
  if (token) return token;
  try {
    return new URL(url).searchParams.get("token") || "";
  } catch {
    return "";
  }
}

export async function getAuth() {
  if (!authInstance) {
    authInstance = (async () => {
      try {
        const { betterAuth } = await nativeImport<any>("better-auth");
        const { prismaAdapter } = await nativeImport<any>("better-auth/adapters/prisma");
        const { hashPassword, verifyPassword } = await nativeImport<any>("better-auth/crypto");
        const { bearer } = await nativeImport<any>("better-auth/plugins");

        const socialProviders: Record<string, any> = {};
        if (env.googleClientId && env.googleClientSecret) {
          socialProviders.google = {
            clientId: env.googleClientId,
            clientSecret: env.googleClientSecret,
          };
        }
        if (env.facebookClientId && env.facebookClientSecret) {
          socialProviders.facebook = {
            clientId: env.facebookClientId,
            clientSecret: env.facebookClientSecret,
          };
        }

        const trustedOrigins = Array.from(
          new Set([env.appUrl, ...env.frontendAppUrls].filter(Boolean)),
        ) as string[];

        return betterAuth({
          secret: env.betterAuthSecret,
          baseURL: env.betterAuthUrl,
          trustedOrigins,
          database: prismaAdapter(prisma, { provider: "postgresql" }),
          plugins: [bearer()],
          advanced: {
            defaultCookieAttributes: {
              sameSite: env.isProduction ? "none" : "lax",
              secure: env.isProduction,
              httpOnly: true,
            },
          },
          user: {
            additionalFields: {
              role: { type: "string", defaultValue: "user", input: false },
            },
          },
          account: {
            // OAuth state/cookie checks stay ENABLED (login-CSRF protection).
            storeStateStrategy: "cookie",
            accountLinking: {
              enabled: true,
              trustedProviders: ["google", "facebook"],
            },
          },

          emailAndPassword: {
            enabled: true,
            minPasswordLength: 8,
            maxPasswordLength: 128,
            requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
            // New passwords use Better Auth's scrypt. Legacy bcrypt hashes
            // (created by older versions / seed script) are still accepted.
            password: {
              hash: (password: string) => hashPassword(password),
              verify: async ({ hash, password }: { hash: string; password: string }) => {
                if (hash.startsWith("$2")) return bcrypt.compare(password, hash);
                return verifyPassword({ hash, password });
              },
            },
            sendResetPassword: async ({
              user,
              url,
              token,
            }: {
              user: { email: string; name: string };
              url: string;
              token?: string;
            }) => {
              const resetToken = extractToken(token, url);
              const resetUrl = resetToken
                ? `${env.frontendAppUrl}/reset-password?token=${encodeURIComponent(resetToken)}`
                : url;
              // NOTE: never log the link/token — it is a credential.
              await sendEmail(user.email, "Reset your NGV password 🔑", passwordResetEmailTemplate(resetUrl));
            },
          },

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
              const verificationToken = extractToken(token, url);
              const verificationUrl = verificationToken
                ? `${env.frontendAppUrl}/verify-email?token=${encodeURIComponent(verificationToken)}`
                : url;
              await sendEmail(user.email, "Verify your NGV account 🎬", verificationEmailTemplate(verificationUrl));
            },
          },

          ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),

          session: {
            expiresIn: 7 * 24 * 60 * 60,
            updateAge: 24 * 60 * 60,
            cookieCache: { enabled: true, maxAge: 5 * 60 },
          },

          databaseHooks: {
            user: {
              create: {
                after: async (user: { name: string; email: string }) => {
                  sendEmail(user.email, "Welcome to NGV 🎬", welcomeEmailTemplate(user.name)).catch(() => {});
                },
              },
            },
            session: {
              create: {
                after: async (session: { userId: string }) => {
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
        authInstance = null; // allow retry on next request
        console.error("🔴 Better Auth Initialization Failed:", e);
        throw e;
      }
    })();
  }
  return authInstance;
}
