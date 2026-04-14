"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.betterAuthNodeHandler = exports.auth = void 0;
const better_auth_1 = require("better-auth");
const prisma_1 = require("better-auth/adapters/prisma");
const prisma_2 = __importDefault(require("./prisma"));
const env_1 = require("../config/env");
const node_1 = require("better-auth/node");
exports.auth = (0, better_auth_1.betterAuth)({
    secret: env_1.env.betterAuthSecret,
    baseURL: env_1.env.betterAuthUrl,
    database: (0, prisma_1.prismaAdapter)(prisma_2.default, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: [env_1.env.appUrl, env_1.env.betterAuthUrl],
});
exports.betterAuthNodeHandler = (0, node_1.toNodeHandler)(exports.auth);
