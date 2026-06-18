"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ATTENDANCE_STATUSES = new Set(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);

const DAY_FROM_DATE_INDEX = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function timetableDayFromDate(value: Date) {
  return DAY_FROM_DATE_INDEX[value.getUTCDay()];
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function requireLecturerUser() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      accountStatus: true,
      role: { select: { name: true } },
    },
  });

  if (
    !user ||
    !user.isActive ||
    user.accountStatus !== "ACTIVE" ||
    user.role.name !== "lecturer"
  ) {
    redirect("/unauthorized");
  }

  return user;
}

function redirectBack(params: {
  entryId?: string;
  date?: string;
  success?: string;
  error?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params.entryId) searchParams.set("entryId", params.entryId);
  if (params.date) searchParams.set("date", params.date);
  if (params.success) searchParams.set("success", params.success);
  if (params.error) searchParams.set("error", params.error);

  const query = searchParams.toString();
  redirect(`/lecturer/attendance${query ? `?${query}` : ""}`);
}

export async function saveLecturerAttendance(formData: FormData) {
  const lecturer = await requireLecturerUser();

  const timetableEntryId = readString(formData, "timetableEntryId");
  const sessionDateText = readString(formData, "sessionDate");
  const notes = readString(formData, "notes");
  const studentIds = formData
    .getAll("studentId")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!timetableEntryId || !sessionDateText) {
    redirectBack({ error: "Select a timetable lesson and attendance date." });
  }

  const sessionDate = parseDateOnly(sessionDateText);

  if (!sessionDate) {
    redirectBack({
      entryId: timetableEntryId,
      error: "Use a valid attendance date.",
    });
  }

  const timetableEntry = await prisma.timetableEntry.findFirst({
    where: {
      id: timetableEntryId,
      lecturerId: lecturer.id,
      isActive: true,
    } as any,
    select: {
      id: true,
      intakeId: true,
      dayOfWeek: true,
      startPeriod: true,
      endPeriod: true,
    },
  });

  if (!timetableEntry) {
    redirectBack({
      date: sessionDateText,
      error: "The selected lesson is not assigned to you.",
    });
  }

  const dateDay = timetableDayFromDate(sessionDate!);

  if (dateDay !== String(timetableEntry.dayOfWeek)) {
    redirectBack({
      entryId: timetableEntryId,
      date: sessionDateText,
      error: `The selected date is ${formatStatus(dateDay)}, but this lesson is scheduled on ${formatStatus(String(timetableEntry.dayOfWeek))}.`,
    });
  }

  if (studentIds.length === 0) {
    redirectBack({
      entryId: timetableEntryId,
      date: sessionDateText,
      error: "No students were found for this class register.",
    });
  }

  const validStudents = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      intakeId: timetableEntry.intakeId,
      status: "ACTIVE",
    } as any,
    select: { id: true },
  });

  if (validStudents.length !== studentIds.length) {
    redirectBack({
      entryId: timetableEntryId,
      date: sessionDateText,
      error: "One or more students do not belong to this class.",
    });
  }

  const attendanceSession = await prisma.attendanceSession.upsert({
    where: {
      timetableEntryId_sessionDate: {
        timetableEntryId,
        sessionDate: sessionDate!,
      },
    } as any,
    update: {
      takenById: lecturer.id,
      notes: notes || null,
      dayOfWeek: timetableEntry.dayOfWeek,
      startPeriod: timetableEntry.startPeriod,
      endPeriod: timetableEntry.endPeriod,
    } as any,
    create: {
      intakeId: timetableEntry.intakeId,
      timetableEntryId,
      sessionDate: sessionDate!,
      dayOfWeek: timetableEntry.dayOfWeek,
      startPeriod: timetableEntry.startPeriod,
      endPeriod: timetableEntry.endPeriod,
      takenById: lecturer.id,
      notes: notes || null,
    } as any,
    select: { id: true },
  });

  for (const studentId of studentIds) {
    const rawStatus = readString(formData, `status_${studentId}`) || "PRESENT";
    const status = ATTENDANCE_STATUSES.has(rawStatus) ? rawStatus : "PRESENT";
    const remarks = readString(formData, `remarks_${studentId}`);

    await prisma.studentAttendanceRecord.upsert({
      where: {
        attendanceSessionId_studentId: {
          attendanceSessionId: attendanceSession.id,
          studentId,
        },
      } as any,
      update: {
        status,
        remarks: remarks || null,
        markedById: lecturer.id,
        markedAt: new Date(),
      } as any,
      create: {
        attendanceSessionId: attendanceSession.id,
        studentId,
        status,
        remarks: remarks || null,
        markedById: lecturer.id,
      } as any,
    });
  }

  revalidatePath("/lecturer/attendance");
  revalidatePath("/coordinator/attendance");

  redirectBack({
    entryId: timetableEntryId,
    date: sessionDateText,
    success: "Attendance saved successfully.",
  });
}

export async function deleteLecturerAttendanceSession(formData: FormData) {
  const lecturer = await requireLecturerUser();

  const attendanceSessionId = readString(formData, "attendanceSessionId");
  const timetableEntryId = readString(formData, "timetableEntryId");
  const sessionDate = readString(formData, "sessionDate");

  if (!attendanceSessionId) {
    redirectBack({
      entryId: timetableEntryId,
      date: sessionDate,
      error: "Attendance session was not found.",
    });
  }

  const existingSession = await prisma.attendanceSession.findFirst({
    where: {
      id: attendanceSessionId,
      timetableEntry: {
        lecturerId: lecturer.id,
      },
    } as any,
    select: { id: true },
  });

  if (!existingSession) {
    redirectBack({
      entryId: timetableEntryId,
      date: sessionDate,
      error: "You can only remove attendance for lessons assigned to you.",
    });
  }

  await prisma.attendanceSession.delete({
    where: { id: attendanceSessionId },
  });

  revalidatePath("/lecturer/attendance");
  revalidatePath("/coordinator/attendance");

  redirectBack({
    entryId: timetableEntryId,
    date: sessionDate,
    success: "Attendance session removed.",
  });
}
