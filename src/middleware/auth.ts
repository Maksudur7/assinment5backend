import { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../utils/errors";
import { getAuth } from "../lib/better-auth";

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    // 1. Try Better Auth getSession (handles cookies, headers, etc. automatically)
    const auth = await getAuth();
    const headers = new Headers();
    Object.entries(req.headers).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach(val => headers.append(k, val));
      } else if (v !== undefined) {
        headers.set(k, v);
      }
    });

    const sessionData = await auth.api.getSession({
      headers,
      asResponse: false
    });

    if (sessionData && sessionData.session && sessionData.user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: sessionData.user.id },
        select: { role: true },
      });
      req.user = {
        id: sessionData.user.id,
        name: sessionData.user.name,
        email: sessionData.user.email,
        role: dbUser?.role || "user",
      };
      req.session = sessionData.session;
      return next();
    }

    // 2. Fallback to manual Bearer token or Cookie token lookup
    const authHeader = req.headers.authorization || "";
    const [scheme, bearerToken] = authHeader.split(" ");

    const rawCookies = req.headers.cookie || "";
    const cookieToken = rawCookies
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("token=") || c.startsWith("better-auth.session_token="))
      ?.split("=")[1];

    const token = (scheme === "Bearer" && bearerToken) ? bearerToken : cookieToken;

    if (token) {
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (session && session.expiresAt > new Date()) {
        req.user = {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        };
        req.session = {
          id: session.id,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          token: session.token,
        };
        return next();
      }
    }

    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return next(new AppError("Forbidden", 403, "FORBIDDEN"));
  }
  return next();
}
