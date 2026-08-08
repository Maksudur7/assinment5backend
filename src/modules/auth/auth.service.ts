import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { getAuth } from "../../lib/better-auth";
import { sendEmail, welcomeEmailTemplate } from "../../lib/email";
import bcrypt from "bcryptjs";
import * as nodeCrypto from "node:crypto";
const crypto = nodeCrypto.webcrypto;

function generateToken(): string {
  return `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (existingUser) {
    const isGoogleUser = existingUser.accounts.some((acc) => acc.providerId === "google");
    if (isGoogleUser) {
      throw new AppError(
        "An account with this email already exists via Google. Please log in using Google.",
        400,
        "EMAIL_EXISTS_GOOGLE"
      );
    } else {
      throw new AppError(
        "An account with this email already exists. Please log in using your password.",
        400,
        "EMAIL_EXISTS_CREDENTIALS"
      );
    }
  }

  // 1. Try Better Auth signup first
  try {
    const auth = await getAuth();
    const signupRes = await auth.api.signUpEmail({
      body: { name, email, password },
      asResponse: false,
    });
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const sessionToken = (signupRes as any)?.session?.token || (signupRes as any)?.token || generateToken();
      return {
        ...signupRes,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token: sessionToken,
      };
    }
  } catch (err) {
    console.warn("[signUpWithEmail] Better auth native signup warning:", err);
  }

  // 2. Direct fallback signup with bcrypt
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "user",
      emailVerified: true,
    },
  });

  await prisma.account.create({
    data: {
      userId: newUser.id,
      accountId: newUser.email,
      providerId: "credential",
      password: passwordHash,
    },
  });

  const sessionToken = generateToken();
  const session = await prisma.session.create({
    data: {
      userId: newUser.id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  sendEmail(email, "Welcome to NGV 🎬", welcomeEmailTemplate(name)).catch(() => {});

  return {
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    },
    session,
    token: sessionToken,
  };
}

export async function signInWithEmail(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (user.accounts.some((acc) => acc.providerId === "google") && !(user as any).passwordHash) {
    throw new AppError(
      "This account is registered via Google. Please sign in with Google.",
      400,
      "EMAIL_EXISTS_GOOGLE"
    );
  }

  // 1. Check bcrypt password hash first (demo users + seeded users)
  let passwordMatched = false;
  if (user.passwordHash) {
    passwordMatched = await bcrypt.compare(password, user.passwordHash);
  }

  if (!passwordMatched) {
    // Check account password if stored
    const credentialAccount = user.accounts.find((acc) => acc.providerId === "credential");
    if (credentialAccount?.password) {
      if (credentialAccount.password.startsWith("$2a$") || credentialAccount.password.startsWith("$2b$")) {
        passwordMatched = await bcrypt.compare(password, credentialAccount.password);
      } else {
        passwordMatched = credentialAccount.password === password;
      }
    }
  }

  // 2. Try Better Auth native login if bcrypt didn't run
  if (!passwordMatched) {
    try {
      const auth = await getAuth();
      const res = await auth.api.signInEmail({
        body: { email, password },
        asResponse: false,
      });
      if (res) {
        const sessionToken = (res as any)?.session?.token || (res as any)?.token;
        if (sessionToken) {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
          return {
            ...res,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
            token: sessionToken,
          };
        }
      }
    } catch {
      // Ignore native error and fall through to invalid credentials
    }

    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  // 3. Password matched — create active session in DB
  const sessionToken = generateToken();
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    session,
    token: sessionToken,
  };
}

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

export async function getCurrentSession(headers: Headers) {
  const auth = await getAuth();
  return auth.api.getSession({ headers, asResponse: false });
}

export async function listActiveSessions(headers: Headers) {
  const auth = await getAuth();
  const sessions = await auth.api.listSessions({ headers, asResponse: false });

  if (!Array.isArray(sessions)) return sessions;

  const uniqueDevices = new Map<string, any>();
  for (const session of sessions) {
    const key = `${session.userAgent || "unknown"}-${session.ipAddress || "unknown"}`;
    const existing = uniqueDevices.get(key);
    if (!existing || new Date(session.updatedAt) > new Date(existing.updatedAt)) {
      uniqueDevices.set(key, session);
    }
  }
  return Array.from(uniqueDevices.values());
}

export async function revokeCurrentSession(headers: Headers, sessionId: string) {
  const auth = await getAuth();
  const currentSession = await auth.api.getSession({ headers, asResponse: false });
  if (!currentSession || !currentSession.user) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const targetSession = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!targetSession) {
    throw new AppError("Session not found", 404, "NOT_FOUND");
  }

  if (targetSession.userId !== currentSession.user.id) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  await prisma.session.delete({
    where: { id: sessionId },
  });

  return { success: true };
}

export async function revokeAllSessions(headers: Headers) {
  const auth = await getAuth();
  return auth.api.revokeSessions({ headers, asResponse: false });
}
