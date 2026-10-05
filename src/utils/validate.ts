import { NextFunction, Request, Response } from "express";
import { z, ZodType } from "zod";
import { AppError } from "./errors";

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

/**
 * Express middleware that validates & strips unknown keys using Zod.
 * Parsed values replace req.body / req.validatedQuery / req.validatedParams.
 * (Express 5 makes req.query a getter, so parsed query is exposed separately.)
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        const r = schemas.body.safeParse(req.body ?? {});
        if (!r.success) throw toAppError(r.error);
        req.body = r.data;
      }
      if (schemas.query) {
        const r = schemas.query.safeParse(req.query ?? {});
        if (!r.success) throw toAppError(r.error);
        req.validatedQuery = r.data as Record<string, unknown>;
      }
      if (schemas.params) {
        const r = schemas.params.safeParse(req.params ?? {});
        if (!r.success) throw toAppError(r.error);
        req.validatedParams = r.data as Record<string, string>;
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

function toAppError(error: z.ZodError) {
  const details = error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
  const first = details[0];
  const message = first ? `${first.path ? first.path + ": " : ""}${first.message}` : "Invalid request";
  return new AppError(message, 422, "VALIDATION_ERROR", details);
}

// ── Reusable primitives ─────────────────────────────────────────────────────
export const idParam = z.object({ id: z.string().min(1).max(100) });
export const mediaIdParam = z.object({ mediaId: z.string().min(1).max(100) });
export const reviewIdParam = z.object({ reviewId: z.string().min(1).max(100) });
export const commentIdParam = z.object({ commentId: z.string().min(1).max(100) });
export const userIdParam = z.object({ userId: z.string().min(1).max(100) });

/** Pagination with hard caps so clients can't request huge pages. */
export function pagination(defaultLimit = 20, maxLimit = 50) {
  return {
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
  };
}

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "must be a valid http(s) URL");

export const mediaBody = z.object({
  title: z.string().trim().min(1).max(200),
  synopsis: z.string().trim().min(1).max(5000),
  genres: z.array(z.string().trim().min(1).max(50)).min(1).max(20),
  releaseYear: z.coerce.number().int().min(1888).max(new Date().getFullYear() + 2),
  director: z.string().trim().min(1).max(200),
  cast: z.array(z.string().trim().min(1).max(100)).max(50),
  platforms: z.array(z.string().trim().min(1).max(50)).max(20),
  streamingUrl: httpUrl,
  poster: httpUrl,
  duration: z.string().trim().min(1).max(30),
  popularity: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

export const mediaUpdateBody = mediaBody.partial();
