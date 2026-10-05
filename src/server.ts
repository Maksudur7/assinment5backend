import app from "./app";
import prisma from "./lib/prisma";
import { env } from "./config/env";

async function start() {
  await prisma.$connect();

  const server = app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`NGV backend running on http://localhost:${env.port}`);
  });

  const shutdown = async (signal: string) => {
    // eslint-disable-next-line no-console
    console.log(`${signal} received, shutting down...`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});
