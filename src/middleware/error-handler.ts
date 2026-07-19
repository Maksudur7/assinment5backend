import { NextFunction, Request, Response } from "express";
import { errorPayload } from "../utils/http";

export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json(errorPayload("Route not found", "NOT_FOUND"));
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || "INTERNAL_SERVER_ERROR";
  const message = err.message || "Something went wrong";

  try {
    const fs = require('fs');
    const logData = {
      time: new Date().toISOString(),
      statusCode,
      message,
      code,
      details: err.details || null,
      stack: err.stack,
      body: _req.body
    };
    fs.appendFileSync('C:/maksudur work/p classes/assinmentj2/project 1/error-log.txt', JSON.stringify(logData, null, 2) + '\n,\n');
  } catch (e) {}

  return res.status(statusCode).json(errorPayload(message, code, err.details));
}
