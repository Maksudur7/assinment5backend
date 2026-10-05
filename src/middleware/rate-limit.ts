import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { errorPayload } from "../utils/http";

/**
 * Cheap, best-effort in-memory limiter used as a blanket guard for ALL routes.
 * (Per serverless instance only — strict limits use the DB-backed limiter below.)
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimiter({ windowMs, max }: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    sweep(now);
    const key = req.ip || "unknown";

    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
    }
    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json(errorPayload("Rate limit exceeded", "RATE_LIMIT_EXCEEDED"));
    }
    return next();
  };
}

/**
 * Atomic fixed-window counter in Postgres — consistent across all serverless instances.
 * Fails OPEN on DB errors so an outage of the limiter never takes the API down.
 */
export async function consume(key: string, windowMs: number): Promise<{ count: number; resetAt: Date }> {
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>(Prisma.sql`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"
  `);
  const row = rows[0];
  return { count: Number(row.count), resetAt: row.resetAt };
}

type StrictOptions = {
  scope: string;
  windowMs: number;
  max: number;
  /** Return a stable identity; defaults to IP (or user id when authenticated). */
  keyBy?: (req: Request) => string | undefined;
  /** Only count these HTTP methods (default: all). */
  methods?: string[];
};

export function strictRateLimit(options: StrictOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (options.methods && !options.methods.includes(req.method)) return next();
    try {
      const identity = options.keyBy?.(req) ?? req.user?.id ?? req.ip ?? "unknown";
      const { count, resetAt } = await consume(`${options.scope}:${identity}`, options.windowMs);
      res.setHeader("X-RateLimit-Limit", String(options.max));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, options.max - count)));
      if (count > options.max) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000))));
        return res
          .status(429)
          .json(errorPayload("Too many requests, please try again later", "RATE_LIMIT_EXCEEDED"));
      }
    } catch (err) {
      console.error("[rate-limit] store unavailable, failing open:", (err as Error).message);
    }
    return next();
  };
}

/** Housekeeping: drop expired windows. Called opportunistically. */
export async function purgeExpiredRateLimits() {
  await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "resetAt" < NOW() - INTERVAL '1 day'`;
}
