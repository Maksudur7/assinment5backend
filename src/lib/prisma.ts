import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config({ override: true });

let prismaClient: PrismaClient | null = null;

function createPrismaClient() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error("DATABASE_URL is missing. Please set it in environment variables.");
	}

	if (databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+postgres://")) {
		return new PrismaClient({
			accelerateUrl: databaseUrl,
		});
	}

	return new PrismaClient({
		adapter: new PrismaPg({ connectionString: databaseUrl }),
	});
}

function getPrismaClient() {
	if (!prismaClient) {
		prismaClient = createPrismaClient();
	}

	return prismaClient;
}

const prisma = new Proxy({} as PrismaClient, {
	get(_target, prop, receiver) {
		const client = getPrismaClient();
		const value = Reflect.get(client, prop, receiver);
		return typeof value === "function" ? value.bind(client) : value;
	},
});

export default prisma;
