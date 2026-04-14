"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = rateLimiter;
const http_1 = require("../utils/http");
const inMemoryBuckets = new Map();
function rateLimiter({ windowMs, max }) {
    return (req, res, next) => {
        const key = `${req.ip}:${req.baseUrl || ""}:${req.path || ""}`;
        const now = Date.now();
        let bucket = inMemoryBuckets.get(key);
        if (!bucket || now > bucket.resetAt) {
            bucket = { count: 0, resetAt: now + windowMs };
        }
        bucket.count += 1;
        inMemoryBuckets.set(key, bucket);
        if (bucket.count > max) {
            return res.status(429).json((0, http_1.errorPayload)("Rate limit exceeded", "RATE_LIMIT_EXCEEDED"));
        }
        return next();
    };
}
