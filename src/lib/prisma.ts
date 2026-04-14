import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ override: true });

if (!process.env.DATABASE_URL) {
	throw new Error("DATABASE_URL is missing. Please set it in .env");
}

const databaseUrl = process.env.DATABASE_URL;

const prisma = databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://")
	? new PrismaClient({ accelerateUrl: databaseUrl })
	: new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

export default prisma;
