"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const http_1 = require("../utils/http");
function notFoundHandler(_req, res) {
    return res.status(404).json((0, http_1.errorPayload)("Route not found", "NOT_FOUND"));
}
function errorHandler(err, _req, res, _next) {
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
    }
    catch (e) { }
    return res.status(statusCode).json((0, http_1.errorPayload)(message, code, err.details));
}
