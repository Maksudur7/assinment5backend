
import express from "express";
import cors from "cors";
import helmet from "helmet";

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
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { rateLimiter } from "./middleware/rate-limit";

const app = express();

app.get("/", (_req, res) => {
  res.json({ message: "NGV backend running!" });
});

const allowedOrigins = new Set([
  env.appUrl,
  env.frontendAppUrl,
  ...(Array.isArray(env.frontendAppUrls) ? env.frontendAppUrls : []),
]);

const corsOptions = {
  origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    if (!origin || allowedOrigins.has(origin)) {
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

app.use(rateLimiter({ windowMs: 60 * 60 * 1000, max: 1000 }));
app.use("/api/auth", rateLimiter({ windowMs: 60 * 1000, max: 10 }));


app.get("/health", (_req, res) => {
  return res.status(200).json({ ok: true });
});

import { getAuth } from "./lib/better-auth";

// Native dynamic import to bypass CommonJS require() conversion by Vercel/TypeScript
const nativeImport = new Function("specifier", "return import(specifier);");

// Better Auth handler MUST be before express.json() so it can read the raw request stream
app.all(/^\/api\/auth\/(.*)/, async (req, res, next) => {
  try {
    const auth = await getAuth();
    const { toNodeHandler } = await nativeImport("better-auth/node");
    const handler = toNodeHandler(auth);
    
    // We pass req and res to better-auth
    await handler(req, res);
    
    // If better-auth didn't handle it, pass to custom router
    if (!res.headersSent) {
      next();
    }
  } catch (err) {
    next(err);
  }
});

// Now apply express.json() for all other custom routes
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/media", mediaRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/users", usersRouter);
app.use("/api", reviewsRouter);
app.use("/api/watchlist", watchlistRouter);

app.use("/api/admin", adminRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/contact", contactRouter);
app.use("/api/landing", landingRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
