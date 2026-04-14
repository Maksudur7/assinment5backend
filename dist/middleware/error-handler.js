"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const http_1 = require("../utils/http");
function notFoundHandler(_req, res) {
    return res.status(404).json((0, http_1.errorPayload)("Route not found", "NOT_FOUND"));
}
function errorHandler(err, _req, res, _next) {
    const statusCode = err.statusCode || 500;
    const code = err.code || "INTERNAL_SERVER_ERROR";
    const message = err.message || "Something went wrong";
    return res.status(statusCode).json((0, http_1.errorPayload)(message, code, err.details));
}
