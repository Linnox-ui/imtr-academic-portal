"use server";

import { LecturerAllocationRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";

const PAGE_PATH = "/coordinator/lecturer-allocation";

function redirectWithMessage(type: "success" | "error", message: string): never {
  redirect(`${PAGE_PATH}?${type}=${encodeURIComponent(message)}`);
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function readAllocationRole(value: string): LecturerAllocationRole {
  if (value === "CO_LECTURER") return LecturerAllocationRole.CO_LECTURER;
  if (value === "ASSISTANT") return LecturerAllocationRole.ASSISTANT;
  return LecturerAllocationRole.PRIMARY;
}

async function requireIntakeCoordinatorScope() {
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

export async function assignLecturerToUnit(formData: FormData) {
  const scope = await requireIntakeCoordinatorScope();

  const unitAssignmentId = readString(formData, "unitAssignmentId");
  const lecturerId = readString(formData, "lecturerId");
  const allocationRole = readAllocationRole(readString(formData, "allocationRole"));
  const changeReason =
    readString(formData, "changeReason") ||
    `Assigned as ${allocationRole.replaceAll("_", " ").toLowerCase()}.`;

  if (!unitAssignmentId || !lecturerId) {
    redirectWithMessage("error", "Select a unit and lecturer first.");
  }

  const [unitAssignment, lecturer] = await Promise.all([
    prisma.semesterUnitAssignment.findFirst({
      where: {
        id: unitAssignmentId,
        intakeId: scope.intakeId,
        status: "APPROVED",
        unit: {
          courseId: scope.courseId,
        },
        semester: {
          courseYear: {
            courseId: scope.courseId,
          },
        },
      } as any,
      select: {
        id: true,
        unit: {
          select: {
            code: true,
            title: true,
          },
        },
      },
    }),

    prisma.user.findFirst({
      where: {
        id: lecturerId,
        isActive: true,
        accountStatus: "ACTIVE",
        role: {
          name: "lecturer",
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    }),
  ]);

  if (!unitAssignment) {
    redirectWithMessage(
      "error",
      "Only approved units in your assigned intake can receive lecturers.",
    );
  }

  if (!lecturer) {
    redirectWithMessage("error", "Select an active lecturer account.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.lecturerUnitAllocation.updateMany({
      where: {
        intakeId: scope.intakeId,
        unitAssignmentId,
        allocationRole,
        isActive: true,
      },
      data: {
        isActive: false,
        endsAt: new Date(),
        endedById: scope.userId,
        changeReason: `Replaced. ${changeReason}`,
      },
    });

    await tx.lecturerUnitAllocation.create({
      data: {
        intakeId: scope.intakeId,
        unitAssignmentId,
        lecturerId,
        allocatedById: scope.userId,
        allocationRole,
        changeReason,
      },
    });
  });

  revalidatePath(PAGE_PATH);
  redirectWithMessage(
    "success",
    `${unitAssignment.unit.code} assigned to ${[lecturer.firstName, lecturer.lastName]
      .filter(Boolean)
      .join(" ") || lecturer.email}.`,
  );
}

export async function endLecturerAllocation(formData: FormData) {
  const scope = await requireIntakeCoordinatorScope();

  const allocationId = readString(formData, "allocationId");
  const changeReason =
    readString(formData, "changeReason") || "Allocation ended by course coordinator.";

  if (!allocationId) {
    redirectWithMessage("error", "Missing lecturer allocation.");
  }

  const allocation = await prisma.lecturerUnitAllocation.findFirst({
    where: {
      id: allocationId,
      intakeId: scope.intakeId,
      isActive: true,
      unitAssignment: {
        intakeId: scope.intakeId,
        status: "APPROVED",
        unit: {
          courseId: scope.courseId,
        },
        semester: {
          courseYear: {
            courseId: scope.courseId,
          },
        },
      },
    } as any,
    select: {
      id: true,
    },
  });

  if (!allocation) {
    redirectWithMessage("error", "This allocation is not active or is outside your intake.");
  }

  await prisma.lecturerUnitAllocation.update({
    where: {
      id: allocation.id,
    },
    data: {
      isActive: false,
      endsAt: new Date(),
      endedById: scope.userId,
      changeReason,
    },
  });

  revalidatePath(PAGE_PATH);
  redirectWithMessage("success", "Lecturer allocation ended and history was kept.");
}
