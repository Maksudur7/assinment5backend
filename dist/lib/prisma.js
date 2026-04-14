"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
dotenv_1.default.config({ override: true });
if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Please set it in .env");
}
const databaseUrl = process.env.DATABASE_URL;
const prisma = databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://")
    ? new client_1.PrismaClient({ accelerateUrl: databaseUrl })
    : new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg(databaseUrl) });
exports.default = prisma;
