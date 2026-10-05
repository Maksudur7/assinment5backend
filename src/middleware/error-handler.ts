import { NextFunction, Request, Response } from "express";
import { errorPayload } from "../utils/http";

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json(errorPayload("Route not found", "NOT_FOUND"));
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const statusCode: number = Number(err?.statusCode || err?.status) || 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    // Log server-side only. Never log request bodies (they contain passwords/tokens).
    console.error(`[${req.method} ${req.originalUrl}]`, err?.stack || err);
  }

  // Never leak internals for 5xx.
  const message = isServerError ? "Internal server error" : err?.message || "Request failed";
  const code = isServerError ? "INTERNAL_SERVER_ERROR" : err?.code || "BAD_REQUEST";
  const details = isServerError ? undefined : err?.details;

  return res.status(statusCode).json(errorPayload(message, code, details));
}
