"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const env_1 = require("./config/env");
async function start() {
    await prisma_1.default.$connect();
    app_1.default.listen(env_1.env.port, () => {
        // eslint-disable-next-line no-console
        console.log(`NGV backend running on http://localhost:${env_1.env.port}`);
    });
}
start().catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", error);
    process.exit(1);
});
