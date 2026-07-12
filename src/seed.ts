import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo users...");

  // Seed Admin
  const adminPassword = await bcrypt.hash("admin12345", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@ngv.local" },
    update: { role: "admin", passwordHash: adminPassword },
    create: {
      name: "Demo Admin",
      email: "admin@ngv.local",
      passwordHash: adminPassword,
      role: "admin",
      emailVerified: true
    }
  });

  // Check if admin account exists
  const adminAccount = await prisma.account.findFirst({
    where: { userId: admin.id, providerId: "credential" }
  });
  if (!adminAccount) {
    await prisma.account.create({
      data: {
        userId: admin.id,
        accountId: admin.email,
        providerId: "credential",
        password: adminPassword
      }
    });
  } else {
    await prisma.account.update({
      where: { id: adminAccount.id },
      data: { password: adminPassword }
    });
  }
  console.log("✅ Admin user created/updated (admin@ngv.local)");

  // Seed User
  const userPassword = await bcrypt.hash("user12345", 10);
  const user = await prisma.user.upsert({
    where: { email: "user@ngv.local" },
    update: { role: "user", passwordHash: userPassword },
    create: {
      name: "Demo User",
      email: "user@ngv.local",
      passwordHash: userPassword,
      role: "user",
      emailVerified: true
    }
  });

  // Check if user account exists
  const userAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" }
  });
  if (!userAccount) {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.email,
        providerId: "credential",
        password: userPassword
      }
    });
  } else {
    await prisma.account.update({
      where: { id: userAccount.id },
      data: { password: userPassword }
    });
  }
  console.log("✅ Standard user created/updated (user@ngv.local)");

  console.log("🎉 Seeding complete! You can now login with demo credentials.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
