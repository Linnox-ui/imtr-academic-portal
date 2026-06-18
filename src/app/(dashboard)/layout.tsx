import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const session = await auth();

  /*
   * A user without a valid session should return to login.
   * The unauthorized page is only for authenticated users
   * trying to access a role-restricted module.
   */
  if (!session?.user?.id) {
    redirect("/login");
  }

  /*
   * Read the current user and role directly from the database.
   * This prevents an old JWT role from controlling the dashboard.
   */
  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      requiresPasswordChange: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!currentUser || !currentUser.isActive) {
    redirect("/unauthorized");
  }

  if (currentUser.requiresPasswordChange) {
    redirect("/change-password");
  }

  const hasCoordinatorAccess =
    currentUser.role.name === "lecturer"
      ? Boolean(
          await prisma.intakeCoordinatorAssignment.findFirst({
            where: {
              coordinatorId: currentUser.id,
              isActive: true,
              endedAt: null,
            },
            select: {
              id: true,
            },
          }),
        )
      : false;

  let notifications: any[] = [];

  if (currentUser.email) {
    const studentRecord = await prisma.student.findUnique({
      where: { email: currentUser.email },
      select: { id: true },
    });

    notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId: currentUser.id },
          { studentId: studentRecord?.id || "VOID" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  return (
    <DashboardShell
      user={{
        id: currentUser.id,
        email: currentUser.email,
        name: `${currentUser.firstName} ${currentUser.lastName}`,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        role: currentUser.role.name,
        requiresPasswordChange: false,
        hasCoordinatorAccess,
      }}
      notifications={notifications}
    >
      {children}
    </DashboardShell>
  );
}
