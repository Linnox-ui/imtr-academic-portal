import fs from "fs";
import path from "path";

import PDFDocumentImport from "pdfkit";

import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PDFDocument = (PDFDocumentImport as any).default ?? PDFDocumentImport;

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;

const PERIODS = [
  { period: 1, time: "08:20 - 09:20" },
  { period: 2, time: "09:20 - 10:20" },
  { period: 3, time: "11:00 - 12:00" },
  { period: 4, time: "12:00 - 13:00" },
  { period: 5, time: "14:00 - 15:00" },
  { period: 6, time: "15:00 - 16:00" },
] as const;

type TimetableEntryRow = {
  id: string;
  dayOfWeek: string;
  startPeriod: number;
  endPeriod: number;
  room: string | null;
  lecturer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  unitAssignment: {
    unit: {
      code: string;
      title: string;
    };
    semester: {
      title: string;
      courseYear: {
        title: string;
      };
    };
  };
};

type AttendanceSessionRow = {
  id: string;
  timetableEntryId: string;
  sessionDate: Date;
  takenBy: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  records: {
    status: string;
    studentId: string;
    student: {
      id: string;
      admissionNumber: string;
      firstName: string;
      lastName: string;
    };
  }[];
};

type StudentRow = {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
};

export async function GET(request: Request) {
  try {
    const scope = await requireCoordinatorScope();

    if (scope.isGlobal || !scope.intakeId || !scope.intake) {
      return new Response("Unauthorized", { status: 403 });
    }

    const url = new URL(request.url);
    const weekStart = getValidWeekStart(url.searchParams.get("weekStart") || "");
    const weekDates = getWeekDates(weekStart);
    const weekEnd = weekDates[4];

    const [students, timetableEntries, attendanceSessions] = await Promise.all([
      prisma.student.findMany({
        where: {
          intakeId: scope.intakeId,
          status: "ACTIVE",
        } as any,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
        },
      }),

      prisma.timetableEntry.findMany({
        where: {
          intakeId: scope.intakeId,
          isActive: true,
        } as any,
        orderBy: [{ startPeriod: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          dayOfWeek: true,
          startPeriod: true,
          endPeriod: true,
          room: true,
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
              semester: {
                select: {
                  title: true,
                  courseYear: {
                    select: {
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      prisma.attendanceSession.findMany({
        where: {
          intakeId: scope.intakeId,
          sessionDate: {
            gte: weekStart,
            lte: weekEnd,
          },
        } as any,
        orderBy: [{ sessionDate: "asc" }, { startPeriod: "asc" }],
        select: {
          id: true,
          timetableEntryId: true,
          sessionDate: true,
          takenBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          records: {
            select: {
              status: true,
              studentId: true,
              student: {
                select: {
                  id: true,
                  admissionNumber: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const sessionByKey = new Map(
      attendanceSessions.map((session) => [
        `${session.timetableEntryId}:${formatDateInput(session.sessionDate)}`,
        session,
      ]),
    );

    const expectedSessions = buildExpectedSessions(timetableEntries, weekDates, sessionByKey);
    const studentSummaries = buildStudentSummaries(students, attendanceSessions);

    const pdfBuffer = await buildPdf({
      intakeCode: scope.intake.code,
      intakeTitle: scope.intake.title,
      courseLabel: `${scope.intake.course.code} - ${scope.intake.course.title}`,
      weekStart,
      weekEnd,
      expectedSessions,
      studentSummaries,
    });

    const filename = `${scope.intake.code}-attendance-${formatDateInput(weekStart)}-to-${formatDateInput(weekEnd)}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Weekly attendance PDF failed:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(`Weekly attendance PDF failed: ${message}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}

async function buildPdf({
  intakeCode,
  intakeTitle,
  courseLabel,
  weekStart,
  weekEnd,
  expectedSessions,
  studentSummaries,
}: {
  intakeCode: string;
  intakeTitle: string;
  courseLabel: string;
  weekStart: Date;
  weekEnd: Date;
  expectedSessions: {
    date: Date;
    entry: TimetableEntryRow;
    session: AttendanceSessionRow | null;
  }[];
  studentSummaries: {
    admissionNumber: string;
    name: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
  }[];
}) {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 36 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const logoPath = path.join(process.cwd(), "public", "gok-logo.jpg");

  try {
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 38, 28, { width: 54 });
    }
  } catch {
    // If the logo file is missing/corrupt/unsupported, still generate the PDF.
  }

  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .fillColor("#0F172A")
    .text("REPUBLIC OF KENYA", 100, 30, { align: "left" })
    .fontSize(12)
    .text("INSTITUTE OF METEOROLOGICAL TRAINING AND RESEARCH", 100, 48, { align: "left" })
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#475569")
    .text("Weekly Attendance Report", 100, 66, { align: "left" });

  doc
    .fontSize(9)
    .fillColor("#0F172A")
    .text(`Intake: ${intakeCode}`, 620, 30)
    .text(`Week: ${formatDisplayDate(weekStart)} - ${formatDisplayDate(weekEnd)}`, 620, 45)
    .text(`Generated: ${formatDisplayDateTime(new Date())}`, 620, 60);

  doc.moveTo(36, 92).lineTo(806, 92).strokeColor("#CBD5E1").stroke();

  let y = 108;

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor("#0F172A")
    .text(intakeTitle, 36, y)
    .font("Helvetica")
    .fillColor("#475569")
    .text(courseLabel, 36, y + 15);

  y += 48;

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#0F172A")
    .text("Session Summary", 36, y);

  y += 18;

  drawSessionTableHeader(doc, y);
  y += 20;

  if (expectedSessions.length === 0) {
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#64748B")
      .text("No timetable sessions were scheduled for this week.", 40, y + 8);
    y += 36;
  } else {
    for (const item of expectedSessions) {
      if (y > 510) {
        doc.addPage();
        y = 42;
        drawSessionTableHeader(doc, y);
        y += 20;
      }

      const counts = countRecords(item.session?.records ?? []);
      const status = item.session ? "Marked" : "Pending";
      const unit = `${item.entry.unitAssignment.unit.code} - ${item.entry.unitAssignment.unit.title}`;

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#0F172A")
        .text(formatDisplayDate(item.date), 40, y, { width: 70 })
        .text(formatTimeRange(item.entry.startPeriod, item.entry.endPeriod), 115, y, { width: 70 })
        .text(truncate(unit, 42), 190, y, { width: 210 })
        .text(truncate(getUserName(item.entry.lecturer), 22), 405, y, { width: 110 })
        .text(truncate(item.entry.room || "-", 12), 520, y, { width: 60 })
        .text(status, 585, y, { width: 55 })
        .text(`${counts.present}`, 645, y, { width: 30, align: "center" })
        .text(`${counts.absent}`, 680, y, { width: 30, align: "center" })
        .text(`${counts.late}`, 715, y, { width: 30, align: "center" })
        .text(`${counts.excused}`, 750, y, { width: 30, align: "center" });

      y += 18;
      doc.moveTo(36, y - 4).lineTo(806, y - 4).strokeColor("#E2E8F0").stroke();
    }
  }

  y += 16;

  if (y > 450) {
    doc.addPage();
    y = 42;
  }

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor("#0F172A")
    .text("Student Weekly Summary", 36, y);

  y += 18;
  drawStudentTableHeader(doc, y);
  y += 20;

  if (studentSummaries.length === 0) {
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#64748B")
      .text("No active students were found for this intake.", 40, y + 8);
    y += 36;
  } else {
    for (const student of studentSummaries) {
      if (y > 520) {
        doc.addPage();
        y = 42;
        drawStudentTableHeader(doc, y);
        y += 20;
      }

      doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#0F172A")
        .text(student.admissionNumber, 40, y, { width: 120 })
        .text(truncate(student.name, 34), 170, y, { width: 230 })
        .text(`${student.present}`, 440, y, { width: 45, align: "center" })
        .text(`${student.absent}`, 500, y, { width: 45, align: "center" })
        .text(`${student.late}`, 560, y, { width: 45, align: "center" })
        .text(`${student.excused}`, 620, y, { width: 45, align: "center" });

      y += 18;
      doc.moveTo(36, y - 4).lineTo(806, y - 4).strokeColor("#E2E8F0").stroke();
    }
  }

  y += 28;

  if (y > 510) {
    doc.addPage();
    y = 42;
  }

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor("#475569")
    .text(
      "Legend: P = Present, A = Absent, L = Late, E = Excused. Pending sessions were not yet marked by the assigned lecturer.",
      36,
      y,
    )
    .text("This report is generated from timetable-linked attendance records in the IMTR Academic Portal.", 36, y + 16);

  doc.end();
  return done;
}

function drawSessionTableHeader(doc: any, y: number) {
  doc.rect(36, y - 4, 770, 18).fill("#0F172A");
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor("#FFFFFF")
    .text("Date", 40, y, { width: 70 })
    .text("Time", 115, y, { width: 70 })
    .text("Unit", 190, y, { width: 210 })
    .text("Lecturer", 405, y, { width: 110 })
    .text("Room", 520, y, { width: 60 })
    .text("Status", 585, y, { width: 55 })
    .text("P", 645, y, { width: 30, align: "center" })
    .text("A", 680, y, { width: 30, align: "center" })
    .text("L", 715, y, { width: 30, align: "center" })
    .text("E", 750, y, { width: 30, align: "center" });
}

function drawStudentTableHeader(doc: any, y: number) {
  doc.rect(36, y - 4, 770, 18).fill("#0F172A");
  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor("#FFFFFF")
    .text("Admission No.", 40, y, { width: 120 })
    .text("Student", 170, y, { width: 230 })
    .text("Present", 440, y, { width: 45, align: "center" })
    .text("Absent", 500, y, { width: 45, align: "center" })
    .text("Late", 560, y, { width: 45, align: "center" })
    .text("Excused", 620, y, { width: 45, align: "center" });
}

function buildExpectedSessions(
  entries: TimetableEntryRow[],
  dates: Date[],
  sessionByKey: Map<string, AttendanceSessionRow>,
) {
  return dates.flatMap((date, index) => {
    const day = DAYS[index];
    return entries
      .filter((entry) => String(entry.dayOfWeek) === day)
      .sort((a, b) => a.startPeriod - b.startPeriod)
      .map((entry) => ({
        date,
        entry,
        session: sessionByKey.get(`${entry.id}:${formatDateInput(date)}`) ?? null,
      }));
  });
}

function buildStudentSummaries(students: StudentRow[], sessions: AttendanceSessionRow[]) {
  const summaryMap = new Map(
    students.map((student) => [
      student.id,
      {
        admissionNumber: student.admissionNumber,
        name: `${student.firstName} ${student.lastName}`,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      },
    ]),
  );

  for (const session of sessions) {
    for (const record of session.records) {
      const summary = summaryMap.get(record.studentId);
      if (!summary) continue;

      if (record.status === "PRESENT") summary.present += 1;
      if (record.status === "ABSENT") summary.absent += 1;
      if (record.status === "LATE") summary.late += 1;
      if (record.status === "EXCUSED") summary.excused += 1;
    }
  }

  return Array.from(summaryMap.values());
}

function countRecords(records: { status: string }[]) {
  return records.reduce(
    (counts, record) => {
      if (record.status === "PRESENT") counts.present += 1;
      if (record.status === "ABSENT") counts.absent += 1;
      if (record.status === "LATE") counts.late += 1;
      if (record.status === "EXCUSED") counts.excused += 1;
      return counts;
    },
    { present: 0, absent: 0, late: 0, excused: 0 },
  );
}

function getValidWeekStart(value: string) {
  const parsed = parseDateOnly(value) ?? new Date();
  return getMonday(parsed);
}

function getWeekDates(monday: Date) {
  return [0, 1, 2, 3, 4].map((offset) => addDays(monday, offset));
}

function getMonday(value: Date) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDisplayDate(value: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function formatDisplayDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(value);
}

function formatTimeRange(startPeriod: number, endPeriod: number) {
  const start = PERIODS.find((period) => period.period === startPeriod)?.time.split(" - ")[0] ?? "";
  const end = PERIODS.find((period) => period.period === endPeriod)?.time.split(" - ")[1] ?? "";
  return `${start} - ${end}`;
}

function getUserName(user?: { firstName: string; lastName: string; email: string } | null) {
  if (!user) return "Not marked";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 3)}...` : value;
}
