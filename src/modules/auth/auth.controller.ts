import { Request, Response } from "express";
import { AppError } from "../../utils/errors";
import {
	getCurrentSession,
	forgotPassword,
	getSessionUser,
	listActiveSessions,
	resetPassword,
	refreshProviderToken,
	revokeCurrentSession,
	signInWithEmail,
	signUpWithEmail,
	socialSignIn,
} from "./auth.service";

export async function emailSignupController(req: Request, res: Response) {
	 const { name, email, password } = req.body || {};
	 if (!name || !email || !password) {
		 throw new AppError("name, email, password required", 422, "VALIDATION_ERROR");
	 }
	 const user = await signUpWithEmail(name, email, password);
	 console.log('auth controller signup', user);
	 if (user.token) {
		 res.cookie("token", user.token, {
			 httpOnly: true,
			 secure: process.env.NODE_ENV !== "development",
			 sameSite: "lax",
			 maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		 });
	 }
	 return res.status(200).json({ ...user, token: undefined });
}

export async function emailSigninController(req: Request, res: Response) {
	 const { email, password } = req.body || {};
	 if (!email || !password) {
		 throw new AppError("email, password required", 422, "VALIDATION_ERROR");
	 }
	 const user = await signInWithEmail(email, password);
	 console.log('auth controller signin', user);
	 if (user.token) {
		 res.cookie("token", user.token, {
			 httpOnly: true,
			 secure: process.env.NODE_ENV !== "development",
			 sameSite: "lax",
			 maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		 });
	 }
	 return res.status(200).json({ ...user, token: undefined });
}

export async function socialSigninController(req: Request, res: Response) {
	const { provider, idToken } = req.body || {};
	if (!provider || !idToken) {
		throw new AppError("provider, idToken required", 422, "VALIDATION_ERROR");
	}
	const user = await socialSignIn(provider, idToken);
	console.log('auth controller social signin', user);
	return res.status(200).json(user);
}

export async function forgotPasswordController(req: Request, res: Response) {
	const { email } = req.body || {};
	if (!email) throw new AppError("email required", 422, "VALIDATION_ERROR");
	return res.status(200).json(await forgotPassword(email));
}

export async function resetPasswordController(req: Request, res: Response) {
	const { token, newPassword } = req.body || {};
	if (!token || !newPassword) {
		throw new AppError("token and newPassword required", 422, "VALIDATION_ERROR");
	}
	return res.status(200).json(await resetPassword(token, newPassword));
}

export async function sessionController(req: Request, res: Response) {
	const session = await getCurrentSession(new Headers(req.headers as Record<string, string>));
	if (!session) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
	return res.status(200).json({
		session: session.session,
		user: {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email,
			role: (session.user as { role?: "user" | "admin" }).role || "user",
		},
	});
}

export async function signoutController(_req: Request, res: Response) {
	return res.status(200).json({ success: true });
}

export async function sessionsController(req: Request, res: Response) {
	const sessions = await listActiveSessions(new Headers(req.headers as Record<string, string>));
	return res.status(200).json(sessions);
}

export async function revokeSessionController(req: Request, res: Response) {
	const { token } = req.body || {};
	if (!token) throw new AppError("token required", 422, "VALIDATION_ERROR");
	return res.status(200).json(await revokeCurrentSession(new Headers(req.headers as Record<string, string>), String(token)));
}

export async function refreshTokenController(req: Request, res: Response) {
	const { providerId, accountId, userId } = req.body || {};
	if (!providerId) throw new AppError("providerId required", 422, "VALIDATION_ERROR");
	return res.status(200).json(
		await refreshProviderToken(
			new Headers(req.headers as Record<string, string>),
			String(providerId),
			accountId ? String(accountId) : undefined,
			userId ? String(userId) : undefined
		)
	);
}
