import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env";
import { isOriginAllowed, normalizeOrigin } from "./lib/cors";
import { nativeImport } from "./lib/native-import";
import authRouter from "./modules/auth/auth.router";
import mediaRouter from "./modules/media/media.router";
import categoriesRouter from "./modules/categories/categories.router";
import usersRouter from "./modules/users/users.router";
import reviewsRouter from "./modules/reviews/reviews.router";
import watchlistRouter from "./modules/watchlist/watchlist.router";
import adminRouter from "./modules/admin/admin.router";
import dashboardRouter from "./modules/dashboard/dashboard.router";
import contactRouter from "./modules/contact/contact.routes";
import landingRouter from "./modules/landing/landing.routes";
import notificationsRouter from "./modules/notifications/notifications.router";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { rateLimiter } from "./middleware/rate-limit";
import { getAuth } from "./lib/better-auth";
import { AppError } from "./utils/errors";

const app = express();
app.disable("x-powered-by");

// Vercel terminates TLS in front of us with exactly ONE proxy hop. `true` would
// trust any client-supplied X-Forwarded-For and let attackers bypass IP limits.
app.set("trust proxy", 1);

const allowedOrigins = new Set(
  [env.appUrl, env.betterAuthUrl.replace(/\/api\/auth$/, ""), ...env.frontendAppUrls]
    .filter(Boolean)
    .map(normalizeOrigin),
);

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin, { allowed: allowedOrigins, isProduction: env.isProduction })) {
      return callback(null, true);
    }
    return callback(new AppError("CORS origin not allowed", 403, "CORS_FORBIDDEN"));
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 600,
};

app.use(helmet());
app.use(cors(corsOptions));

// Blanket per-IP guard (cheap, in-memory). Strict limits live on specific routes.
app.use(rateLimiter({ windowMs: 60 * 60 * 1000, max: 3000 }));

app.get("/", (req, res) => {
  if (req.headers.accept?.includes("text/html")) {
    return res.redirect(env.frontendAppUrl);
  }
  res.json({ message: "NGV backend running!" });
});

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// ── Auth ────────────────────────────────────────────────────────────────────
// Mounted BEFORE body parsers: Better Auth reads the raw request stream itself.
// 1. Our session-management routes + brute-force limiter
app.use("/api/auth", authRouter);

// 2. Everything else (sign-in/up/out, OAuth callbacks, password reset, verify email,
//    get-session, update-user, change-password...) is served by Better Auth.
app.all(/^\/api\/auth\/(.*)/, async (req, res, next) => {
  try {
    const auth = await getAuth();
    const { toNodeHandler } = await nativeImport<any>("better-auth/node");
    await toNodeHandler(auth)(req, res);
  } catch (err) {
    next(err);
  }
});

// ── Body parsers (small limits; route-specific larger limits are opt-in) ────
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ── App API routes ──────────────────────────────────────────────────────────
app.use("/api/media", mediaRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/users", usersRouter);
app.use("/api", reviewsRouter);
app.use("/api/watchlist", watchlistRouter);
app.use("/api/admin", adminRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/contact", contactRouter);
app.use("/api/landing", landingRouter);
app.use("/api/notifications", notificationsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
