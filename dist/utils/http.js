"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.errorPayload = errorPayload;
function success(res, data, statusCode = 200) {
    return res.status(statusCode).json(data);
}
function errorPayload(message, code, details) {
    return {
        error: true,
        message,
        code,
        details,
    };
}
