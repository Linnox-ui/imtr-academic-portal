import "dotenv/config";

import { createHmac } from "node:crypto";

import { AccountStatus } from "@prisma/client";
import { hash } from "bcryptjs";

import { prisma } from "../src/lib/prisma";

const ROLE_DEFINITIONS = [
  {
    name: "student",
    description: "Student portal access",
  },
  {
    name: "lecturer",
    description: "Lecturer teaching and assessment access",
  },
  {
    name: "coordinator",
    description: "Course coordination access",
  },
  {
    name: "department_admin",
    description: "Department administration access",
  },
  {
    name: "ict_admin",
    description: "ICT support and account recovery access",
  },
  {
    name: "academic_director",
    description: "Academic oversight and approval access",
  },
  {
    name: "super_admin",
    description: "Full system administration access",
  },
] as const;

function requireEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing ${name}. Supply it when running the seed command.`,
    );
  }

  return value;
}

function parseDateOfBirth(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(
      "SEED_SUPER_ADMIN_DOB must use YYYY-MM-DD format.",
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("SEED_SUPER_ADMIN_DOB is invalid.");
  }

  return date;
}

function normalizeNationalId(value: string) {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");

  if (!/^[A-Z0-9]{6,20}$/.test(normalized)) {
    throw new Error(
      "SEED_SUPER_ADMIN_NATIONAL_ID must contain 6–20 letters or digits.",
    );
  }

  return normalized;
}

function normalizePhone(value: string) {
  const normalized = value
    .trim()
    .replace(/[\s()-]/g, "");

  if (!/^\+?\d{9,15}$/.test(normalized)) {
    throw new Error(
      "SEED_SUPER_ADMIN_PHONE must contain 9–15 digits.",
    );
  }

  return normalized;
}

function getIdentitySecret() {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET or BETTER_AUTH_SECRET must exist in .env.",
    );
  }

  return secret;
}

function hashNationalId(nationalId: string) {
  return createHmac("sha256", getIdentitySecret())
    .update(`IMTR_STAFF_IDENTITY:${nationalId}`)
    .digest("hex");
}

async function main() {
  const email = requireEnvironmentValue(
    "SEED_SUPER_ADMIN_EMAIL",
  ).toLowerCase();

  const password = requireEnvironmentValue(
    "SEED_SUPER_ADMIN_PASSWORD",
  );

  if (password.length < 10) {
    throw new Error(
      "SEED_SUPER_ADMIN_PASSWORD must contain at least 10 characters.",
    );
  }

  const firstName =
    process.env.SEED_SUPER_ADMIN_FIRST_NAME?.trim() ||
    "Innocent";

  const lastName =
    process.env.SEED_SUPER_ADMIN_LAST_NAME?.trim() ||
    "Lijodi";

  const nationalId = normalizeNationalId(
    requireEnvironmentValue(
      "SEED_SUPER_ADMIN_NATIONAL_ID",
    ),
  );

  const dateOfBirth = parseDateOfBirth(
    requireEnvironmentValue(
      "SEED_SUPER_ADMIN_DOB",
    ),
  );

  const phone = normalizePhone(
    requireEnvironmentValue(
      "SEED_SUPER_ADMIN_PHONE",
    ),
  );

  const currentYear = new Date().getFullYear();
  const staffNumber = `IMTR/STF/${currentYear}/001`;
  const passwordHash = await hash(password, 12);

  const result = await prisma.$transaction(
    async (transaction) => {
      for (const role of ROLE_DEFINITIONS) {
        await transaction.role.upsert({
          where: {
            name: role.name,
          },
          update: {
            description: role.description,
          },
          create: {
            name: role.name,
            description: role.description,
          },
        });
      }

      const superAdminRole =
        await transaction.role.findUniqueOrThrow({
          where: {
            name: "super_admin",
          },
          select: {
            id: true,
          },
        });

      const superAdmin = await transaction.user.upsert({
        where: {
          email,
        },
        update: {
          firstName,
          lastName,
          password: passwordHash,
          roleId: superAdminRole.id,
          isActive: true,
          accountStatus: AccountStatus.ACTIVE,
          requiresPasswordChange: false,
        },
        create: {
          email,
          firstName,
          lastName,
          password: passwordHash,
          roleId: superAdminRole.id,
          isActive: true,
          accountStatus: AccountStatus.ACTIVE,
          requiresPasswordChange: false,
        },
        select: {
          id: true,
          email: true,
        },
      });

      await transaction.userIdentityProfile.upsert({
        where: {
          userId: superAdmin.id,
        },
        update: {
          nationalIdHash: hashNationalId(nationalId),
          nationalIdLast4: nationalId.slice(-4),
          dateOfBirth,
          phone,
          staffNumber,
          emailVerified: true,
          phoneVerified: true,
        },
        create: {
          userId: superAdmin.id,
          nationalIdHash: hashNationalId(nationalId),
          nationalIdLast4: nationalId.slice(-4),
          dateOfBirth,
          phone,
          staffNumber,
          emailVerified: true,
          phoneVerified: true,
        },
      });

      await transaction.staffNumberSequence.upsert({
        where: {
          year: currentYear,
        },
        update: {
          lastNumber: 1,
        },
        create: {
          year: currentYear,
          lastNumber: 1,
        },
      });

      return {
        email: superAdmin.email,
        staffNumber,
      };
    },
    {
      maxWait: 10_000,
      timeout: 20_000,
    },
  );

  console.log("");
  console.log("✅ Clean test database seeded successfully");
  console.log(`   Super Admin: ${result.email}`);
  console.log(`   Staff Number: ${result.staffNumber}`);
  console.log("");
}

main()
  .catch((error) => {
    console.error("");
    console.error("❌ Test database seed failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
