"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
dotenv_1.default.config({ override: true });
let prismaClient = null;
function createPrismaClient() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is missing. Please set it in environment variables.");
    }
    if (databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://")) {
        return new client_1.PrismaClient({
            accelerateUrl: databaseUrl,
        });
    }
    return new client_1.PrismaClient({
        adapter: new adapter_pg_1.PrismaPg({ connectionString: databaseUrl }),
    });
}
function getPrismaClient() {
    if (!prismaClient) {
        prismaClient = createPrismaClient();
    }
    return prismaClient;
}
const prisma = new Proxy({}, {
    get(_target, prop, receiver) {
        const client = getPrismaClient();
        const value = Reflect.get(client, prop, receiver);
        return typeof value === "function" ? value.bind(client) : value;
    },
});
exports.default = prisma;
