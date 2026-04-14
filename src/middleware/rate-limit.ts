import { NextFunction, Request, Response } from "express";
import { errorPayload } from "../utils/http";

const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.baseUrl || ""}:${req.path || ""}`;
    const now = Date.now();

    let bucket = inMemoryBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
    }

    bucket.count += 1;
    inMemoryBuckets.set(key, bucket);

    if (bucket.count > max) {
      return res.status(429).json(errorPayload("Rate limit exceeded", "RATE_LIMIT_EXCEEDED"));
    }

    return next();
  };
}
