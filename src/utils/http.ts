import { Response } from "express";

export function success<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json(data);
}

export function errorPayload(message: string, code: string, details?: unknown) {
  return {
    error: true,
    message,
    code,
    details,
  };
}
