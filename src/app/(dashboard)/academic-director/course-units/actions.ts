"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";

const COURSE_UNITS_PATH = "/coordinator/course-units";

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    redirect(`${COURSE_UNITS_PATH}?error=missing-${key}`);
  }

  return value.trim();
}

function toMessage(value: string) {
  return encodeURIComponent(value);
}

async function requireEditableCoordinatorScope() {
  const scope = await requireCoordinatorScope();

  if (scope.isGlobal || !scope.intakeId || !scope.courseId) {
    redirect("/unauthorized");
  }

  return {
    userId: scope.user.id,
    intakeId: scope.intakeId,
    courseId: scope.courseId,
  };
}

export async function assignUnitToSemester(formData: FormData) {
  const scope = await requireEditableCoordinatorScope();

  const unitId = readFormValue(formData, "unitId");
  const semesterId = readFormValue(formData, "semesterId");

  const [unit, semester, existingAssignment, lockedPlan] = await Promise.all([
    prisma.courseUnit.findFirst({
      where: {
        id: unitId,
        courseId: scope.courseId,
        isActive: true,
      } as any,
      select: {
        id: true,
      },
    }),

    prisma.courseSemester.findFirst({
      where: {
        id: semesterId,
        isActive: true,
        courseYear: {
          courseId: scope.courseId,
          isActive: true,
        },
      } as any,
      select: {
        id: true,
      },
    }),

    prisma.semesterUnitAssignment.findFirst({
      where: {
        intakeId: scope.intakeId,
        unitId,
      } as any,
      select: {
        id: true,
      },
    }),

    prisma.semesterUnitAssignment.findFirst({
      where: {
        intakeId: scope.intakeId,
        status: {
          in: ["SUBMITTED", "APPROVED", "ARCHIVED"],
        },
      } as any,
      select: {
        id: true,
        status: true,
      },
    }),
  ]);

  if (!unit) {
    redirect(`${COURSE_UNITS_PATH}?error=${toMessage("This unit does not belong to your assigned course.")}`);
  }

  if (!semester) {
    redirect(`${COURSE_UNITS_PATH}?error=${toMessage("This semester does not belong to your assigned course.")}`);
  }

  if (existingAssignment) {
    redirect(`${COURSE_UNITS_PATH}?error=${toMessage("This unit is already placed in the intake plan.")}`);
  }

  if (lockedPlan) {
    redirect(`${COURSE_UNITS_PATH}?error=${toMessage("This plan is locked because it has already been submitted or approved.")}`);
  }

  await prisma.semesterUnitAssignment.create({
    data: {
      intakeId: scope.intakeId,
      semesterId,
      unitId,
      status: "DRAFT",
      createdById: scope.userId,
    } as any,
  });

  revalidatePath(COURSE_UNITS_PATH);
  redirect(`${COURSE_UNITS_PATH}?success=${toMessage("Unit added to the semester plan.")}`);
}

export async function removeUnitFromSemester(formData: FormData) {
  const scope = await requireEditableCoordinatorScope();
  const assignmentId = readFormValue(formData, "assignmentId");

  const assignment = await prisma.semesterUnitAssignment.findFirst({
    where: {
      id: assignmentId,
      intakeId: scope.intakeId,
    } as any,
    select: {
      id: true,
      status: true,
      _count: {
        select: {
          lecturerAllocations: true,
          assessments: true,
        },
      },
    },
  });

  if (!assignment) {
    redirect(`${COURSE_UNITS_PATH}?error=${toMessage("Unit assignment was not found in your assigned intake.")}`);
  }

  if (!["DRAFT", "AMENDMENT_REQUESTED", "REJECTED"].includes(String(assignment.status))) {
    redirect(`${COURSE_UNITS_PATH}?error=${toMessage("Submitted or approved units cannot be removed by the coordinator.")}`);
  }

  if (assignment._count.lecturerAllocations > 0 || assignment._count.assessments > 0) {
    redirect(`${COURSE_UNITS_PATH}?error=${toMessage("This unit already has lecturer or assessment records and cannot be removed safely.")}`);
  }

  await prisma.semesterUnitAssignment.delete({
    where: {
      id: assignment.id,
    },
  });

  revalidatePath(COURSE_UNITS_PATH);
  redirect(`${COURSE_UNITS_PATH}?success=${toMessage("Unit removed from the semester plan.")}`);
}

export async function submitUnitPlanForApproval() {
  const scope = await requireEditableCoordinatorScope();

  const [draftCount, lockedPlan] = await Promise.all([
    prisma.semesterUnitAssignment.count({
      where: {
        intakeId: scope.intakeId,
        status: {
          in: ["DRAFT", "AMENDMENT_REQUESTED"],
        },
      } as any,
    }),

    prisma.semesterUnitAssignment.findFirst({
      where: {
        intakeId: scope.intakeId,
        status: {
          in: ["SUBMITTED", "APPROVED"],
        },
      } as any,
      select: {
        id: true,
        status: true,
      },
    }),
  ]);

  if (lockedPlan) {
    redirect(`${COURSE_UNITS_PATH}?error=${toMessage("This intake plan has already been submitted or approved.")}`);
  }

  if (draftCount === 0) {
    redirect(`${COURSE_UNITS_PATH}?error=${toMessage("Add at least one unit before submitting the plan.")}`);
  }

  await prisma.semesterUnitAssignment.updateMany({
    where: {
      intakeId: scope.intakeId,
      status: {
        in: ["DRAFT", "AMENDMENT_REQUESTED"],
      },
    } as any,
    data: {
      status: "SUBMITTED",
      submittedById: scope.userId,
      submittedAt: new Date(),
      reviewedById: null,
      reviewedAt: null,
      reviewNote: null,
      rejectionReason: null,
    } as any,
  });

  revalidatePath(COURSE_UNITS_PATH);
  redirect(`${COURSE_UNITS_PATH}?success=${toMessage("Unit plan submitted to Academic Director for approval.")}`);
}
