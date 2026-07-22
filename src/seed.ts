import prisma from "./lib/prisma";
import bcrypt from "bcryptjs";

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
  const userPassword = await bcrypt.hash("mashud1215", 10);
  const user = await prisma.user.upsert({
    where: { email: "maksudurr538@gmail.com" },
    update: { role: "user", passwordHash: userPassword },
    create: {
      name: "Demo User",
      email: "maksudurr538@gmail.com",
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
  // Seed Standard User (user@ngv.local)
  const stdUserPassword = await bcrypt.hash("user12345", 10);
  const stdUser = await prisma.user.upsert({
    where: { email: "user@ngv.local" },
    update: { role: "user", passwordHash: stdUserPassword, emailVerified: true },
    create: {
      name: "Demo User",
      email: "user@ngv.local",
      passwordHash: stdUserPassword,
      role: "user",
      emailVerified: true
    }
  });

  const stdUserAccount = await prisma.account.findFirst({
    where: { userId: stdUser.id, providerId: "credential" }
  });
  if (!stdUserAccount) {
    await prisma.account.create({
      data: {
        userId: stdUser.id,
        accountId: stdUser.email,
        providerId: "credential",
        password: stdUserPassword
      }
    });
  } else {
    await prisma.account.update({
      where: { id: stdUserAccount.id },
      data: { password: stdUserPassword }
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
