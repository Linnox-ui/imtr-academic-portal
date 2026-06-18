"use server";

import { TimetableDay } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";

const PAGE_PATH = "/coordinator/timetable";

const ALLOWED_SLOTS = new Set([
  "1-1",
  "2-2",
  "1-2",
  "3-3",
  "4-4",
  "3-4",
  "5-5",
  "6-6",
  "5-6",
]);

function redirectWithMessage(type: "success" | "error", message: string): never {
  redirect(`${PAGE_PATH}?${type}=${encodeURIComponent(message)}`);
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function readDay(value: string): TimetableDay | null {
  if (value === "MONDAY") return TimetableDay.MONDAY;
  if (value === "TUESDAY") return TimetableDay.TUESDAY;
  if (value === "WEDNESDAY") return TimetableDay.WEDNESDAY;
  if (value === "THURSDAY") return TimetableDay.THURSDAY;
  if (value === "FRIDAY") return TimetableDay.FRIDAY;
  return null;
}

function readSlot(value: string) {
  if (!ALLOWED_SLOTS.has(value)) {
    return null;
  }

  const [start, end] = value.split("-").map((item) => Number(item));

  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    return null;
  }

  if (start < 1 || end > 6 || start > end || end - start > 1) {
    return null;
  }

  return {
    startPeriod: start,
    endPeriod: end,
  };
}

function formatSlot(startPeriod: number, endPeriod: number) {
  const periodTimes: Record<number, string> = {
    1: "08:20-09:20",
    2: "09:20-10:20",
    3: "11:00-12:00",
    4: "12:00-13:00",
    5: "14:00-15:00",
    6: "15:00-16:00",
  };

  if (startPeriod === endPeriod) {
    return periodTimes[startPeriod] || `Period ${startPeriod}`;
  }

  const startLabel = periodTimes[startPeriod]?.split("-")[0] || `P${startPeriod}`;
  const endLabel = periodTimes[endPeriod]?.split("-")[1] || `P${endPeriod}`;

  return `${startLabel}-${endLabel}`;
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

export async function createTimetableEntry(formData: FormData) {
  const scope = await requireIntakeCoordinatorScope();

  const lecturerAllocationId = readString(formData, "lecturerAllocationId");
  const dayOfWeek = readDay(readString(formData, "dayOfWeek"));
  const slot = readSlot(readString(formData, "slot"));
  const room = readString(formData, "room");
  const notes = readString(formData, "notes");

  if (!lecturerAllocationId || !dayOfWeek || !slot) {
    redirectWithMessage("error", "Select a unit, day and valid time slot first.");
  }

  const allocation = await prisma.lecturerUnitAllocation.findFirst({
    where: {
      id: lecturerAllocationId,
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
      lecturer: {
        isActive: true,
        accountStatus: "ACTIVE",
        role: {
          name: "lecturer",
        },
      },
    } as any,
    select: {
      id: true,
      intakeId: true,
      unitAssignmentId: true,
      lecturerId: true,
      lecturer: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      unitAssignment: {
        select: {
          unit: {
            select: {
              code: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!allocation) {
    redirectWithMessage(
      "error",
      "Only approved units with active lecturer allocation can be timetabled.",
    );
  }

  const overlapFilter = {
    startPeriod: {
      lte: slot.endPeriod,
    },
    endPeriod: {
      gte: slot.startPeriod,
    },
  };

  const [classConflict, lecturerConflict, roomConflict] = await Promise.all([
    prisma.timetableEntry.findFirst({
      where: {
        intakeId: scope.intakeId,
        dayOfWeek,
        isActive: true,
        ...overlapFilter,
      },
      select: {
        id: true,
        startPeriod: true,
        endPeriod: true,
        unitAssignment: {
          select: {
            unit: {
              select: {
                code: true,
                title: true,
              },
            },
          },
        },
      },
    }),

    prisma.timetableEntry.findFirst({
      where: {
        lecturerId: allocation.lecturerId,
        dayOfWeek,
        isActive: true,
        ...overlapFilter,
      },
      select: {
        id: true,
        startPeriod: true,
        endPeriod: true,
        intake: {
          select: {
            code: true,
          },
        },
        unitAssignment: {
          select: {
            unit: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    }),

    room
      ? prisma.timetableEntry.findFirst({
          where: {
            room: {
              equals: room,
              mode: "insensitive",
            },
            dayOfWeek,
            isActive: true,
            ...overlapFilter,
          } as any,
          select: {
            id: true,
            startPeriod: true,
            endPeriod: true,
            intake: {
              select: {
                code: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  if (classConflict) {
    redirectWithMessage(
      "error",
      `Class conflict: ${classConflict.unitAssignment.unit.code} is already scheduled at ${formatSlot(
        classConflict.startPeriod,
        classConflict.endPeriod,
      )}.`,
    );
  }

  if (lecturerConflict) {
    const lecturerName =
      [allocation.lecturer.firstName, allocation.lecturer.lastName]
        .filter(Boolean)
        .join(" ") || allocation.lecturer.email;

    redirectWithMessage(
      "error",
      `Lecturer conflict: ${lecturerName} is already teaching ${lecturerConflict.unitAssignment.unit.code} for ${lecturerConflict.intake.code} at ${formatSlot(
        lecturerConflict.startPeriod,
        lecturerConflict.endPeriod,
      )}.`,
    );
  }

  if (roomConflict) {
    redirectWithMessage(
      "error",
      `Room conflict: ${room} is already booked for ${roomConflict.intake.code} at ${formatSlot(
        roomConflict.startPeriod,
        roomConflict.endPeriod,
      )}.`,
    );
  }

  await prisma.timetableEntry.create({
    data: {
      intakeId: scope.intakeId,
      unitAssignmentId: allocation.unitAssignmentId,
      lecturerAllocationId: allocation.id,
      lecturerId: allocation.lecturerId,
      dayOfWeek,
      startPeriod: slot.startPeriod,
      endPeriod: slot.endPeriod,
      room: room || null,
      notes: notes || null,
      createdById: scope.userId,
    },
  });

  revalidatePath(PAGE_PATH);
  redirectWithMessage(
    "success",
    `${allocation.unitAssignment.unit.code} scheduled on ${dayOfWeek.toLowerCase().replaceAll("_", " ")} at ${formatSlot(
      slot.startPeriod,
      slot.endPeriod,
    )}.`,
  );
}

export async function removeTimetableEntry(formData: FormData) {
  const scope = await requireIntakeCoordinatorScope();

  const entryId = readString(formData, "entryId");

  if (!entryId) {
    redirectWithMessage("error", "Missing timetable entry.");
  }

  const entry = await prisma.timetableEntry.findFirst({
    where: {
      id: entryId,
      intakeId: scope.intakeId,
      isActive: true,
    },
    select: {
      id: true,
      unitAssignment: {
        select: {
          unit: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });

  if (!entry) {
    redirectWithMessage("error", "This timetable entry is not active or is outside your intake.");
  }

  await prisma.timetableEntry.update({
    where: {
      id: entry.id,
    },
    data: {
      isActive: false,
    },
  });

  revalidatePath(PAGE_PATH);
  redirectWithMessage("success", `${entry.unitAssignment.unit.code} removed from timetable.`);
}
