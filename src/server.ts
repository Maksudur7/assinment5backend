import app from "./app";
import prisma from "./lib/prisma";
import { env } from "./config/env";

async function start() {
  await prisma.$connect();

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`NGV backend running on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", error);
  process.exit(1);
});
