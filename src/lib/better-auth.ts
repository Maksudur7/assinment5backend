import prisma from "./prisma";
import { env } from "../config/env";

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

        return betterAuth({
          secret: env.betterAuthSecret || "a_very_long_secret_key_123", // নিশ্চিত করুন সিক্রেট আছে
          baseURL: env.betterAuthUrl, // এটি কি http://localhost:4000/api/auth ?
          database: prismaAdapter(prisma, {
            provider: "postgresql",
          }),
          emailAndPassword: {
            enabled: true,
          },
          trustedOrigins: Array.from(
            new Set([env.appUrl, env.betterAuthUrl, ...env.frontendAppUrls]),
          ),
        });
      } catch (e) {
        console.error("🔴 Better Auth Initialization Failed:", e); // এই লগটি দেখুন
        throw e;
      }
    })();
  }
  return authInstance;
}
