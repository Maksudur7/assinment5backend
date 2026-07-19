"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const env_1 = require("./config/env");
const auth_router_1 = __importDefault(require("./modules/auth/auth.router"));
const media_router_1 = __importDefault(require("./modules/media/media.router"));
const categories_router_1 = __importDefault(require("./modules/categories/categories.router"));
const users_router_1 = __importDefault(require("./modules/users/users.router"));
const reviews_router_1 = __importDefault(require("./modules/reviews/reviews.router"));
const watchlist_router_1 = __importDefault(require("./modules/watchlist/watchlist.router"));
const admin_router_1 = __importDefault(require("./modules/admin/admin.router"));
const dashboard_router_1 = __importDefault(require("./modules/dashboard/dashboard.router"));
const contact_routes_1 = __importDefault(require("./modules/contact/contact.routes"));
const landing_routes_1 = __importDefault(require("./modules/landing/landing.routes"));
const error_handler_1 = require("./middleware/error-handler");
const rate_limit_1 = require("./middleware/rate-limit");
const app = (0, express_1.default)();
app.get("/", (_req, res) => {
    res.json({ message: "NGV backend running!" });
});
const allowedOrigins = new Set([
    env_1.env.appUrl,
    env_1.env.frontendAppUrl,
    ...(Array.isArray(env_1.env.frontendAppUrls) ? env_1.env.frontendAppUrls : []),
]);
const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }
        return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use((0, rate_limit_1.rateLimiter)({ windowMs: 60 * 60 * 1000, max: 1000 }));
app.use("/api/auth", (0, rate_limit_1.rateLimiter)({ windowMs: 60 * 1000, max: 10 }));
app.get("/health", (_req, res) => {
    return res.status(200).json({ ok: true });
});
const better_auth_1 = require("./lib/better-auth");
const node_1 = require("better-auth/node");
// Use app.all with regex to avoid Express 5 path errors, and avoid app.use which strips req.url
app.all(/^\/api\/auth\/(.*)/, async (req, res, next) => {
    try {
        const auth = await (0, better_auth_1.getAuth)();
        const handler = (0, node_1.toNodeHandler)(auth);
        // We pass req and res to better-auth
        await handler(req, res);
        // If better-auth didn't handle it, pass to custom router
        if (!res.headersSent) {
            next();
        }
    }
    catch (err) {
        next(err);
    }
});
app.use("/api/auth", auth_router_1.default);
app.use("/api/media", media_router_1.default);
app.use("/api/categories", categories_router_1.default);
app.use("/api/users", users_router_1.default);
app.use("/api", reviews_router_1.default);
app.use("/api/watchlist", watchlist_router_1.default);
app.use("/api/admin", admin_router_1.default);
app.use("/api/dashboard", dashboard_router_1.default);
app.use("/api/contact", contact_routes_1.default);
app.use("/api/landing", landing_routes_1.default);
app.use(error_handler_1.notFoundHandler);
app.use(error_handler_1.errorHandler);
exports.default = app;
