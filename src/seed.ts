import bcrypt from "bcryptjs";
import prisma from "./lib/prisma";
import { env } from "./config/env";

async function upsertCredentialUser(opts: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "user";
}) {
  if (opts.password.length < 10) {
    throw new Error(
      `Password for ${opts.email} must be set via env (min 10 chars). ` +
        `See .env.example (SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD).`,
    );
  }

  const passwordHash = await bcrypt.hash(opts.password, 12);

  const user = await prisma.user.upsert({
    where: { email: opts.email },
    update: { role: opts.role, passwordHash, emailVerified: true },
    create: {
      name: opts.name,
      email: opts.email,
      passwordHash,
      role: opts.role,
      emailVerified: true,
    },
  });

  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (account) {
    await prisma.account.update({ where: { id: account.id }, data: { password: passwordHash } });
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }

  console.log(`✅ ${opts.role} ready: ${opts.email}`);
}

async function main() {
  console.log("Seeding...");

  await upsertCredentialUser({
    name: "Demo Admin",
    email: env.seedAdminEmail,
    password: env.seedAdminPassword,
    role: "admin",
  });

  await upsertCredentialUser({
    name: "Demo User",
    email: env.seedUserEmail,
    password: env.seedUserPassword,
    role: "user",
  });

  const categories = [
    { name: "Action", icon: "🎬" },
    { name: "Thriller", icon: "🔪" },
    { name: "Comedy", icon: "😂" },
    { name: "Drama", icon: "🎭" },
    { name: "Sci-Fi", icon: "🚀" },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { name: c.name }, update: {}, create: c });
  }
  console.log("✅ Categories seeded");

  console.log("🎉 Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
