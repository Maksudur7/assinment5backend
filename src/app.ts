
import express from "express";
import cors from "cors";

import { env } from "./config/env";
import authRouter from "./modules/auth/auth.router";
import mediaRouter from "./modules/media/media.router";
import categoriesRouter from "./modules/categories/categories.router";
import usersRouter from "./modules/users/users.router";
import reviewsRouter from "./modules/reviews/reviews.router";
import watchlistRouter from "./modules/watchlist/watchlist.router";
import purchasesRouter from "./modules/purchases/purcheses.router";
import paymentsRouter from "./modules/payments/payments.router";
import adminRouter from "./modules/admin/admin.router";
import dashboardRouter from "./modules/dashboard/dashboard.router";
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

app.use(cors(corsOptions));
app.use(express.json());

app.use(rateLimiter({ windowMs: 60 * 60 * 1000, max: 1000 }));
app.use("/api/auth", rateLimiter({ windowMs: 60 * 1000, max: 10 }));
app.use("/api/purchases", rateLimiter({ windowMs: 60 * 60 * 1000, max: 50 }));
app.use("/api/payments", rateLimiter({ windowMs: 60 * 60 * 1000, max: 80 }));

app.get("/health", (_req, res) => {
  return res.status(200).json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/media", mediaRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/users", usersRouter);
app.use("/api", reviewsRouter);
app.use("/api/watchlist", watchlistRouter);
app.use("/api/purchases", purchasesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/dashboard", dashboardRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
