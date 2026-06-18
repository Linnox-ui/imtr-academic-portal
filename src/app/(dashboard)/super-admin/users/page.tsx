import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { SuperAdminUserManager } from "./super-admin-user-manager";

export const dynamic = "force-dynamic";

export default async function SuperAdminUsersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentAdmin = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      accountStatus: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (
    !currentAdmin ||
    !currentAdmin.isActive ||
    currentAdmin.accountStatus !== "ACTIVE" ||
    currentAdmin.role.name !== "super_admin"
  ) {
    redirect("/unauthorized");
  }

  const [roles, users] = await Promise.all([
    prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    }),

    prisma.user.findMany({
      orderBy: [
        {
          createdAt: "desc",
        },
        {
          firstName: "asc",
        },
      ],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        accountStatus: true,
        requiresPasswordChange: true,
        createdAt: true,
        updatedAt: true,

        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },

        identityProfile: {
          select: {
            nationalIdLast4: true,
            dateOfBirth: true,
            phone: true,
            staffNumber: true,
            emailVerified: true,
            phoneVerified: true,
          },
        },

        studentProfile: {
          select: {
            id: true,
            admissionNumber: true,
            academicStatus: true,

            intake: {
              select: {
                id: true,
                code: true,
                title: true,

                course: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const activeUsers = users.filter(
    (user) => user.isActive && user.accountStatus === "ACTIVE",
  ).length;

  const inactiveUsers = users.filter(
    (user) => !user.isActive || user.accountStatus !== "ACTIVE",
  ).length;

  const passwordChangeRequired = users.filter(
    (user) => user.requiresPasswordChange,
  ).length;

  const superAdminCount = users.filter(
    (user) =>
      user.role.name === "super_admin" &&
      user.isActive &&
      user.accountStatus === "ACTIVE",
  ).length;

  const incompleteIdentityProfiles = users.filter(
    (user) =>
      user.role.name !== "student" &&
      (!user.identityProfile ||
        !user.identityProfile.staffNumber ||
        !user.identityProfile.nationalIdLast4 ||
        !user.identityProfile.dateOfBirth ||
        !user.identityProfile.phone),
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <SuperAdminUserManager
        currentAdmin={{
          id: currentAdmin.id,
          name: `${currentAdmin.firstName} ${currentAdmin.lastName}`,
          email: currentAdmin.email,
        }}
        summary={{
          totalUsers: users.length,
          activeUsers,
          inactiveUsers,
          passwordChangeRequired,
          activeSuperAdmins: superAdminCount,
          totalRoles: roles.length,
          incompleteIdentityProfiles,
        }}
        roles={roles.map((role) => ({
          id: role.id,
          name: role.name,
          description: role.description,
          userCount: role._count.users,
        }))}
        users={users.map((user) => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          accountStatus: user.accountStatus,
          requiresPasswordChange: user.requiresPasswordChange,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),

          role: {
            id: user.role.id,
            name: user.role.name,
            description: user.role.description,
          },

          identityProfile: user.identityProfile
            ? {
                nationalIdLast4: user.identityProfile.nationalIdLast4,
                dateOfBirth:
                  user.identityProfile.dateOfBirth?.toISOString() ?? null,
                phone: user.identityProfile.phone,
                staffNumber: user.identityProfile.staffNumber,
                emailVerified: user.identityProfile.emailVerified,
                phoneVerified: user.identityProfile.phoneVerified,
              }
            : null,

          studentProfile: user.studentProfile
            ? {
                id: user.studentProfile.id,
                admissionNumber: user.studentProfile.admissionNumber,
                academicStatus: user.studentProfile.academicStatus,

                intake: {
                  id: user.studentProfile.intake.id,
                  code: user.studentProfile.intake.code,
                  title: user.studentProfile.intake.title,

                  course: {
                    id: user.studentProfile.intake.course.id,
                    code: user.studentProfile.intake.course.code,
                    title: user.studentProfile.intake.course.title,
                  },
                },
              }
            : null,
        }))}
      />
    </div>
  );
}
