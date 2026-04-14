import { NextFunction, Request, Response } from "express";
import { errorPayload } from "../utils/http";

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json(errorPayload("Route not found", "NOT_FOUND"));
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_SERVER_ERROR";
  const message = err.message || "Something went wrong";

  return res.status(statusCode).json(errorPayload(message, code, err.details));
}
