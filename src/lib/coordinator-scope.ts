import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireCoordinatorScope() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
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
    !currentUser ||
    !currentUser.isActive ||
    currentUser.accountStatus !== "ACTIVE"
  ) {
    redirect("/unauthorized");
  }

  const roleName = currentUser.role.name;

  if (roleName === "super_admin") {
    return {
      user: currentUser,
      isGlobal: true,
      assignmentId: null,
      intakeId: null,
      courseId: null,
      intake: null,
    };
  }

  if (roleName !== "lecturer") {
    redirect("/unauthorized");
  }

  const assignment = await prisma.intakeCoordinatorAssignment.findFirst({
    where: {
      coordinatorId: currentUser.id,
      isActive: true,
      endedAt: null,
    },
    orderBy: {
      assignedAt: "desc",
    },
    select: {
      id: true,
      intakeId: true,
      intake: {
        select: {
          id: true,
          code: true,
          title: true,
          year: true,
          status: true,
          courseId: true,
          course: {
            select: {
              id: true,
              code: true,
              title: true,
              category: true,
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    redirect("/unauthorized");
  }

  return {
    user: currentUser,
    isGlobal: false,
    assignmentId: assignment.id,
    intakeId: assignment.intakeId,
    courseId: assignment.intake.courseId,
    intake: assignment.intake,
  };
}