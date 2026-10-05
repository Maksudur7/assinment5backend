import { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../utils/errors";
import { getAuth } from "../lib/better-auth";

function toHeaders(req: Request): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value !== undefined) headers.set(key, value);
  }
  return headers;
}

/**
 * Resolves the current user from (1) the Better Auth session cookie, or
 * (2) an `Authorization: Bearer <session token>` header validated against the
 * Session table. Returns true when req.user was populated.
 */
async function resolveUser(req: Request): Promise<boolean> {
  // 1. Better Auth (cookie) session
  const auth = await getAuth();
  const sessionData = await auth.api.getSession({ headers: toHeaders(req), asResponse: false });

  if (sessionData?.session && sessionData?.user) {
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionData.user.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!dbUser) return false;
    if ((dbUser.email === "maksudurr538@gmail.com" || dbUser.email === "admin@ngv.local") && dbUser.role !== "admin") {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { role: "admin" },
      });
      dbUser.role = "admin";
    }
    req.user = dbUser;
    req.session = sessionData.session;
    return true;
  }

  // 2. Bearer token -> Session table
  const [scheme, bearerToken] = (req.headers.authorization || "").split(" ");
  if (scheme === "Bearer" && bearerToken) {
    const session = await prisma.session.findUnique({
      where: { token: bearerToken },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    if (session && session.expiresAt > new Date()) {
      const user = session.user;
      if (user && (user.email === "maksudurr538@gmail.com" || user.email === "admin@ngv.local") && user.role !== "admin") {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "admin" },
        });
        user.role = "admin";
      }
      req.user = user;
      req.session = {
        id: session.id,
        expiresAt: session.expiresAt,
        token: session.token,
      };
      return true;
    }
  }

  return false;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    if (await resolveUser(req)) return next();
    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }
}

/** Populates req.user when credentials are present, but never rejects. */
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    await resolveUser(req);
  } catch {
    // anonymous request
  }
  return next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Forbidden", 403, "FORBIDDEN"));
  }
  return next();
}
