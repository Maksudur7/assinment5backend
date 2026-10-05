import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";

/**
 * Sign-up / sign-in / sign-out / password flows are handled natively by
 * Better Auth (mounted in app.ts). This service only exposes session
 * management helpers scoped to the AUTHENTICATED user.
 */

export async function getSessionUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
  return { user };
}

/** Active sessions of the user. Tokens are NEVER returned — only ids. */
export async function listActiveSessions(userId: string, currentSessionId?: string) {
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
      ipAddress: true,
      userAgent: true,
    },
  });

  // Collapse duplicate sessions from the same device
  const byDevice = new Map<string, (typeof sessions)[number]>();
  for (const s of sessions) {
    const key = `${s.userAgent || "unknown"}-${s.ipAddress || "unknown"}`;
    if (!byDevice.has(key)) byDevice.set(key, s);
  }

  return Array.from(byDevice.values()).map((s) => ({
    ...s,
    current: s.id === currentSessionId,
  }));
}

export async function revokeSessionById(userId: string, sessionId: string) {
  const result = await prisma.session.deleteMany({ where: { id: sessionId, userId } });
  if (result.count === 0) throw new AppError("Session not found", 404, "NOT_FOUND");
  return { success: true };
}

export async function revokeOtherSessions(userId: string, currentSessionId?: string) {
  await prisma.session.deleteMany({
    where: { userId, ...(currentSessionId ? { id: { not: currentSessionId } } : {}) },
  });
  return { success: true };
}
