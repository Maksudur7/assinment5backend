import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import {
  getCurrentSession,
  getSessionUser,
  listActiveSessions,
  revokeCurrentSession,
  revokeAllSessions,
  signInWithEmail,
  signUpWithEmail,
} from "./auth.service";

export async function emailSignupController(req: Request, res: Response) {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    throw new AppError(
      "name, email, password required",
      422,
      "VALIDATION_ERROR",
    );
  }
  const result = await signUpWithEmail(name, email, password);
  return res.status(201).json(result);
}

export async function emailSigninController(req: Request, res: Response) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    throw new AppError("email, password required", 422, "VALIDATION_ERROR");
  }
  const user = await signInWithEmail(email, password);

  if (user.token) {
    res.cookie("token", user.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
  return res.status(200).json(user);
}

export async function getSessionUserController(req: Request, res: Response) {
  const userId = req.params.userId || req.query.userId || req.user?.id;
  if (!userId) throw new AppError("userId required", 400, "VALIDATION_ERROR");
  const result = await getSessionUser(userId as string);
  return res.status(200).json(result);
}

export async function sessionController(req: Request, res: Response) {
  const session = await getCurrentSession(
    new Headers(req.headers as Record<string, string>),
  );
  if (!session) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
  return res.status(200).json({
    session: session.session,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: (session.user as { role?: "user" | "admin" }).role || "user",
      emailVerified: session.user.emailVerified,
    },
  });
}

export async function signoutController(req: Request, res: Response) {
  res.clearCookie("token");
  return res.status(200).json({ success: true });
}

export async function sessionsController(req: Request, res: Response) {
  const sessions = await listActiveSessions(
    new Headers(req.headers as Record<string, string>),
  );
  return res.status(200).json(sessions);
}

export async function revokeSessionController(req: Request, res: Response) {
  const { token } = req.body || {};
  if (!token) throw new AppError("token required", 422, "VALIDATION_ERROR");
  return res
    .status(200)
    .json(
      await revokeCurrentSession(
        new Headers(req.headers as Record<string, string>),
        String(token),
      ),
    );
}

export async function revokeAllSessionsController(
  req: Request,
  res: Response,
) {
  return res
    .status(200)
    .json(
      await revokeAllSessions(
        new Headers(req.headers as Record<string, string>),
      ),
    );
}
