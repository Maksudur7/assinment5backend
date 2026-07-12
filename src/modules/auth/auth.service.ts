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
  const auth = await getAuth();
  await auth.api.signUpEmail({
    body: { name, email, password },
    asResponse: false,
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("USER_NOT_FOUND", 404, "USER_NOT_FOUND");

  // Send welcome email (non-blocking)
  sendEmail(email, "Welcome to NGV 🎬", welcomeEmailTemplate(name)).catch(
    () => {},
  );

  // Note: Better Auth will automatically send the verification email.
  // User must verify before they can sign in (requireEmailVerification: true).
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    message:
      "Account created. Please check your email to verify your account before signing in.",
  } satisfies AuthUser & { token?: string; emailVerified: boolean; message: string };
}

export async function signInWithEmail(email: string, password: string) {
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
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    token: sessionToken,
  } satisfies AuthUser & { token: string; emailVerified: boolean };
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
  return auth.api.listSessions({ headers, asResponse: false });
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
