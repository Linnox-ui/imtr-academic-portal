import { config } from "dotenv";
config();

import { PrismaClient, AccountStatus } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// 1. Establish the connection pool
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 2. Initialize with adapter to satisfy Prisma 7 strict requirements
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("Seeding started...");

  // Upsert Role
  const adminRole = await prisma.role.upsert({
    where: { name: "super_admin" },
    update: {},
    create: {
      name: "super_admin",
      description: "System Administrator",
    },
  });

  // Hash Password
  const hashedPassword = await bcrypt.hash("Swee20001...", 10);

  // Upsert Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: "innocentlijodi@gmail.com" },
    update: {},
    create: {
      email: "innocentlijodi@gmail.com",
      firstName: "Innocent",
      lastName: "Lijodi",
      password: hashedPassword,
      roleId: adminRole.id,
      isActive: true,
      accountStatus: AccountStatus.ACTIVE,
      requiresPasswordChange: false,
    },
  });

  console.log("Seeding complete. Admin created:", adminUser.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
