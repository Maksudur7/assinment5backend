import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";
import { getAuth } from "../../lib/better-auth";

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
  const res = await auth.api.signUpEmail({
    body: { name, email, password },
    asResponse: false,
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("USER_NOT_FOUND", 404, "USER_NOT_FOUND");

  	console.log('auth service signup', user);


  const sessionToken = (res as any)?.session?.token || (res as any)?.token;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: sessionToken || null,
  } satisfies AuthUser & { token: string | null };
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

  	console.log('auth service signin', user);


  const sessionToken = (res as any)?.session?.token || (res as any)?.token;

  if (!sessionToken) {
    throw new AppError("Authentication failed", 401, "INVALID_CREDENTIALS");
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: sessionToken,
  } satisfies AuthUser & { token: string };
}

export async function socialSignIn(provider: string, idToken: string) {
  const auth = await getAuth();
  if (!["google", "github", "facebook"].includes(provider)) {
    throw new AppError("Invalid provider", 422, "VALIDATION_ERROR");
  }

  const providerId = String(idToken).slice(0, 120);
  const pseudoEmail = `${providerId}@${provider}.ngv.social`;
  const pseudoPassword = crypto.randomBytes(16).toString("hex");

  let user = await prisma.user.findUnique({ where: { email: pseudoEmail } });

  if (!user) {
    const hash = await bcrypt.hash(pseudoPassword, 10);
    user = await prisma.user.create({
      data: {
        name: `${provider}-user-${crypto.randomBytes(4).toString("hex")}`,
        email: pseudoEmail,
        passwordHash: hash,
      },
    });
  }

  const signin = await auth.api
    .signInEmail({
      body: { email: pseudoEmail, password: pseudoPassword },
      asResponse: false,
    })
    .catch(async () => {
      const hash = await bcrypt.hash(pseudoPassword, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hash },
      });
      return await auth.api.signInEmail({
        body: { email: pseudoEmail, password: pseudoPassword },
        asResponse: false,
      });
    });

  const sessionToken =
    (signin as any)?.session?.token || (signin as any)?.token;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: sessionToken,
  };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = crypto.randomBytes(24).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      },
    });
  }

  return { success: true, message: "Password reset email sent" };
}

export async function resetPassword(token: string, newPassword: string) {
  const reset = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    throw new AppError(
      "Invalid or expired reset token",
      400,
      "VALIDATION_ERROR",
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { success: true, message: "Password reset successful" };
}

export async function getSessionUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
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

export async function refreshProviderToken(
  headers: Headers,
  providerId: string,
  accountId?: string,
  userId?: string,
) {
  const auth = await getAuth();
  return auth.api.refreshToken({
    headers,
    body: {
      providerId,
      ...(accountId ? { accountId } : {}),
      ...(userId ? { userId } : {}),
    },
    asResponse: false,
  });
}
