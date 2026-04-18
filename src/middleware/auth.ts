import { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../utils/errors";

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }


    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    };
    // Attach session info for controller use
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
