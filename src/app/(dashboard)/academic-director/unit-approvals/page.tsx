import { redirect } from "next/navigation";
import { UnitAssignmentStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { UnitApprovalManager } from "./unit-approval-manager";

export const dynamic = "force-dynamic";

const ACADEMIC_ADMIN_ROLES = ["super_admin", "academic_director"];

export default async function UnitApprovalsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      isActive: true,
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
    !ACADEMIC_ADMIN_ROLES.includes(currentUser.role.name)
  ) {
    redirect("/unauthorized");
  }

  const pendingSemesters = await prisma.courseSemester.findMany({
    where: {
      unitAssignments: {
        some: {
          status: UnitAssignmentStatus.SUBMITTED,
        },
      },
    },
    select: {
      id: true,
      title: true,
      semesterNumber: true,
      sequence: true,
      periodType: true,
      courseYear: {
        select: {
          title: true,
          yearNumber: true,
          sequence: true,
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
      unitAssignments: {
        where: {
          status: UnitAssignmentStatus.SUBMITTED,
        },
        orderBy: {
          submittedAt: "asc",
        },
        select: {
          id: true,
          status: true,
          submittedAt: true,
          unit: {
            select: {
              id: true,
              code: true,
              title: true,
              description: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          submittedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  const sortedSemesters = pendingSemesters.sort((first, second) => {
    const courseComparison = first.courseYear.course.title.localeCompare(
      second.courseYear.course.title,
    );

    if (courseComparison !== 0) {
      return courseComparison;
    }

    if (first.courseYear.sequence !== second.courseYear.sequence) {
      return first.courseYear.sequence - second.courseYear.sequence;
    }

    return first.sequence - second.sequence;
  });

  const reviews = sortedSemesters.map((semester) => ({
    id: semester.id,
    title: semester.title,
    semesterNumber: semester.semesterNumber,
    sequence: semester.sequence,
    periodType: String(semester.periodType),
    courseYear: {
      title: semester.courseYear.title,
      yearNumber: semester.courseYear.yearNumber,
    },
    course: {
      id: semester.courseYear.course.id,
      code: semester.courseYear.course.code,
      title: semester.courseYear.course.title,
      category: String(semester.courseYear.course.category),
    },
    assignments: semester.unitAssignments.map((assignment) => ({
      id: assignment.id,
      status: String(assignment.status),
      submittedAt: assignment.submittedAt?.toISOString() || null,
      unit: assignment.unit,
      createdBy: assignment.createdBy,
      submittedBy: assignment.submittedBy,
    })),
  }));

  return (
    <UnitApprovalManager
      reviewer={{
        id: currentUser.id,
        name: `${currentUser.firstName} ${currentUser.lastName}`,
        role: currentUser.role.name,
      }}
      reviews={reviews}
    />
  );
}
