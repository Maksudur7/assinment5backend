import prisma from "./prisma";
import { env } from "../config/env";

let authInstance: Promise<any> | null = null;

async function nativeImport<T>(specifier: string): Promise<T> {
  const importer = new Function("specifier", "return import(specifier);") as (specifier: string) => Promise<T>;
  return importer(specifier);
}

export async function getAuth() {
  if (!authInstance) {
    authInstance = (async () => {
      const { betterAuth } = await nativeImport<any>("better-auth");
      const { prismaAdapter } = await nativeImport<any>("better-auth/adapters/prisma");

      return betterAuth({
        secret: env.betterAuthSecret,
        baseURL: env.betterAuthUrl,
        database: prismaAdapter(prisma, {
          provider: "postgresql",
        }),
        emailAndPassword: {
          enabled: true,
        },
        trustedOrigins: [env.appUrl, env.betterAuthUrl],
      });
    })();
  }

  return authInstance;
}
