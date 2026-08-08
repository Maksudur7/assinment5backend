import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";

import { env } from "./config/env";
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

const app = express();
app.set("trust proxy", true);

app.get("/", (req, res) => {
  if (req.headers.accept?.includes("text/html")) {
    const targetFrontend = env.frontendAppUrl || "https://ngv-black.vercel.app";
    return res.redirect(targetFrontend);
  }
  res.json({ message: "NGV backend running!" });
});

const allowedOrigins = new Set(
  [
    env.appUrl,
    env.betterAuthUrl,
    env.frontendAppUrl,
    ...(Array.isArray(env.frontendAppUrls) ? env.frontendAppUrls : []),
    "https://ngv-black.vercel.app",
    "https://ngv-backend.vercel.app",
    "http://localhost:3000",
    "http://localhost:4000",
  ]
    .filter(Boolean)
    .map((url) => url.trim().replace(/\/+$/, ""))
);

const corsOptions = {
  origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);
    const cleaned = origin.trim().replace(/\/+$/, "");
    if (
      allowedOrigins.has(cleaned) ||
      cleaned.endsWith(".vercel.app") ||
      cleaned.includes("localhost") ||
      cleaned.includes("127.0.0.1")
    ) {
      return callback(null, true);
    }

    return callback(new Error("CORS origin not allowed"));
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(rateLimiter({ windowMs: 60 * 60 * 1000, max: 2000 }));

app.get("/health", (_req, res) => {
  return res.status(200).json({ ok: true });
});

app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

// Native dynamic import to bypass CommonJS require() conversion by Vercel/TypeScript
const nativeImport = new Function("specifier", "return import(specifier);");

// 1. Mount custom auth router (credential login/signup/sessions)
app.use("/api/auth", authRouter);

// 2. Better Auth native fallback handler (for OAuth Google/Facebook callbacks)
app.all(/^\/api\/auth\/(.*)/, async (req, res, next) => {
  try {
    const auth = await getAuth();
    const { toNodeHandler } = await nativeImport("better-auth/node");
    const handler = toNodeHandler(auth);
    await handler(req, res);
    if (!res.headersSent) next();
  } catch (err) {
    console.error("🔴 Better Auth OAuth Fallback Error:", err);
    next(err);
  }
});

// App API routes
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
