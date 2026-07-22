"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Seeding demo users...");
    // Seed Admin
    const adminPassword = await bcryptjs_1.default.hash("admin12345", 10);
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
    }
    else {
        await prisma.account.update({
            where: { id: adminAccount.id },
            data: { password: adminPassword }
        });
    }
    console.log("✅ Admin user created/updated (admin@ngv.local)");
    // Seed User
    const userPassword = await bcryptjs_1.default.hash("mashud1215", 10);
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
    }
    else {
        await prisma.account.update({
            where: { id: userAccount.id },
            data: { password: userPassword }
        });
    }
    console.log("✅ Standard user created/updated (maksudurr538@gmail.com)");
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
