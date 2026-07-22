import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { getAuth } from "../../lib/better-auth";
import { sendEmail, welcomeEmailTemplate } from "../../lib/email";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
};

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
) {
  // Check for existing user first
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (existingUser) {
    const isGoogleUser = existingUser.accounts.some(acc => acc.providerId === "google");
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

  const auth = await getAuth();
  const signupRes = await auth.api.signUpEmail({
    body: { name, email, password },
    asResponse: false,
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("USER_NOT_FOUND", 404, "USER_NOT_FOUND");

  // Send welcome email (non-blocking)
  sendEmail(email, "Welcome to NGV 🎬", welcomeEmailTemplate(name)).catch(
    () => {},
  );

  return {
    ...signupRes,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    },
    message:
      "Account created. Please check your email to verify your account before signing in.",
  };
}

export async function signInWithEmail(email: string, password: string) {
  // Check if this is a Google-only user attempting email signin
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (existingUser && existingUser.accounts.some(acc => acc.providerId === "google") && !(existingUser as any).passwordHash) {
    throw new AppError(
      "This account is registered via Google. Please sign in with Google.",
      400,
      "EMAIL_EXISTS_GOOGLE"
    );
  }

  const auth = await getAuth();

  const res = await auth.api.signInEmail({
    body: { email, password },
    asResponse: false,
  });

  if (!res) {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("USER_NOT_FOUND", 404, "USER_NOT_FOUND");

  const sessionToken = (res as any)?.session?.token || (res as any)?.token;

  if (!sessionToken) {
    throw new AppError("Authentication failed", 401, "INVALID_CREDENTIALS");
  }

  // Update last login
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

  // Deduplicate sessions by unique User Agent & IP Address to only show unique devices
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

export async function revokeCurrentSession(headers: Headers, token: string) {
  const auth = await getAuth();
  return auth.api.revokeSession({
    headers,
    body: { token },
    asResponse: false,
  });
}

export async function revokeAllSessions(headers: Headers) {
  const auth = await getAuth();
  return auth.api.revokeSessions({ headers, asResponse: false });
}
