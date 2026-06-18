import type { ElementType } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  FileText,
  GraduationCap,
  MapPin,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as const;

const PERIODS = [
  { period: 1, block: "Morning", time: "08:20 - 09:20" },
  { period: 2, block: "Morning", time: "09:20 - 10:20" },
  { period: 3, block: "Mid-morning", time: "11:00 - 12:00" },
  { period: 4, block: "Mid-morning", time: "12:00 - 13:00" },
  { period: 5, block: "Afternoon", time: "14:00 - 15:00" },
  { period: 6, block: "Afternoon", time: "15:00 - 16:00" },
] as const;

type CoordinatorAttendancePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

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
  notes: string | null;
  takenBy: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  records: {
    id: string;
    status: string;
    student: {
      id: string;
      admissionNumber: string;
      firstName: string;
      lastName: string;
    };
  }[];
};

export default async function CoordinatorAttendancePage({
  searchParams,
}: CoordinatorAttendancePageProps) {
  const scope = await requireCoordinatorScope();

  if (scope.isGlobal || !scope.intakeId) {
    redirect("/unauthorized");
  }

  const params = searchParams ? await searchParams : {};
  const requestedWeekStart = readParam(params.weekStart);
  const weekStart = getValidWeekStart(requestedWeekStart);
  const weekDates = getWeekDates(weekStart);
  const weekEnd = weekDates[4];

  const [timetableEntries, attendanceSessions, activeStudents] = await Promise.all([
    prisma.timetableEntry.findMany({
      where: {
        intakeId: scope.intakeId,
        isActive: true,
      } as any,
      orderBy: [
        { dayOfWeek: "asc" },
        { startPeriod: "asc" },
        { createdAt: "asc" },
      ],
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
      orderBy: [
        { sessionDate: "asc" },
        { startPeriod: "asc" },
      ],
      select: {
        id: true,
        timetableEntryId: true,
        sessionDate: true,
        notes: true,
        takenBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        records: {
          select: {
            id: true,
            status: true,
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

    prisma.student.count({
      where: {
        intakeId: scope.intakeId,
        status: "ACTIVE",
      } as any,
    }),
  ]);

  const sessionByKey = new Map(
    attendanceSessions.map((session) => [
      `${session.timetableEntryId}:${formatDateInput(session.sessionDate)}`,
      session,
    ]),
  );

  const expectedSessions = buildExpectedSessions(timetableEntries, weekDates, sessionByKey);
  const markedSessions = expectedSessions.filter((item) => item.session).length;
  const unmarkedSessions = expectedSessions.length - markedSessions;

  const summaryTotals = attendanceSessions.reduce(
    (totals, session) => {
      for (const record of session.records) {
        if (record.status === "PRESENT") totals.present += 1;
        if (record.status === "ABSENT") totals.absent += 1;
        if (record.status === "LATE") totals.late += 1;
        if (record.status === "EXCUSED") totals.excused += 1;
      }
      return totals;
    },
    { present: 0, absent: 0, late: 0, excused: 0 },
  );

  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);
  const pdfHref = `/coordinator/attendance/weekly-report?weekStart=${formatDateInput(weekStart)}`;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Coordinator Attendance
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Weekly Attendance Overview
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              Compiled attendance for {scope.intake?.code}. Lecturers mark lessons; coordinator monitors and exports records.
            </p>
          </div>

          <a
            href={pdfHref}
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Weekly PDF
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ClipboardCheck}
          label="Scheduled"
          value={expectedSessions.length}
          helper="Lessons this week"
        />

        <StatCard
          icon={CheckCircle2}
          label="Marked"
          value={markedSessions}
          helper="Registers submitted"
        />

        <StatCard
          icon={Clock3}
          label="Pending"
          value={unmarkedSessions}
          helper="Not yet marked"
        />

        <StatCard
          icon={Users}
          label="Students"
          value={activeStudents}
          helper="Active class list"
        />
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm">
        <form method="GET" className="grid gap-3 md:grid-cols-[auto_1fr_auto_auto_auto] md:items-center">
          <Link
            href={`/coordinator/attendance?weekStart=${formatDateInput(previousWeek)}`}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-black text-slate-700 transition-all hover:bg-slate-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Link>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Week
            </p>
            <p className="mt-1 text-sm font-black text-slate-950">
              {formatDisplayDate(weekStart)} - {formatDisplayDate(weekEnd)}
            </p>
          </div>

          <input
            type="date"
            name="weekStart"
            defaultValue={formatDateInput(weekStart)}
            className="h-12 rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
          />

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
          >
            Load Week
          </button>

          <Link
            href={`/coordinator/attendance?weekStart=${formatDateInput(nextWeek)}`}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-black text-slate-700 transition-all hover:bg-slate-200"
          >
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </form>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {weekDates.map((date, index) => {
            const day = DAYS[index];
            const daySessions = expectedSessions.filter(
              (item) => formatDateInput(item.date) === formatDateInput(date),
            );
            const dayMarked = daySessions.filter((item) => item.session).length;

            return (
              <section
                key={day}
                className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm"
              >
                <SectionHeader
                  icon={CalendarDays}
                  title={`${formatStatus(day)} · ${formatDisplayDate(date)}`}
                  subtitle={`${daySessions.length} scheduled lessons · ${dayMarked} marked`}
                />

                {daySessions.length ? (
                  <div className="grid gap-3 p-5 sm:p-6">
                    {daySessions.map((item) => (
                      <SessionCard
                        key={`${item.entry.id}-${formatDateInput(item.date)}`}
                        item={item}
                        activeStudents={activeStudents}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No lessons scheduled"
                    text="There are no timetable sessions for this class on this day."
                  />
                )}
              </section>
            );
          })}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
              Weekly Record
            </p>

            <h2 className="mt-2 text-lg font-black tracking-tight">
              {scope.intake?.code}
            </h2>

            <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
              {scope.intake?.title} · {scope.intake?.course.code} - {scope.intake?.course.title}
            </p>

            <div className="mt-5 grid gap-3">
              <DarkInfo icon={CalendarDays} label="Week" value={`${formatDisplayDate(weekStart)} - ${formatDisplayDate(weekEnd)}`} />
              <DarkInfo icon={ClipboardCheck} label="Marked" value={`${markedSessions} of ${expectedSessions.length}`} />
              <DarkInfo icon={FileText} label="PDF" value="Weekly official record" />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Student Totals
            </p>

            <div className="mt-4 grid gap-3">
              <MiniStatus label="Present" value={summaryTotals.present} tone="emerald" />
              <MiniStatus label="Absent" value={summaryTotals.absent} tone="amber" />
              <MiniStatus label="Late" value={summaryTotals.late} tone="sky" />
              <MiniStatus label="Excused" value={summaryTotals.excused} tone="slate" />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">
                  Access Rule
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Coordinator oversight only.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <GuideItem text="Lecturers mark attendance for their own sessions." />
              <GuideItem text="Coordinator monitors all sessions for the assigned intake." />
              <GuideItem text="Weekly PDF is generated for official records." />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function SessionCard({
  item,
  activeStudents,
}: {
  item: {
    date: Date;
    entry: TimetableEntryRow;
    session: AttendanceSessionRow | null;
  };
  activeStudents: number;
}) {
  const counts = countRecords(item.session?.records ?? []);
  const marked = Boolean(item.session);
  const lecturerName = getUserName(item.entry.lecturer);

  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-200/50 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                marked ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {marked ? "Marked" : "Pending"}
            </span>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-sky-700">
              {formatTimeRange(item.entry.startPeriod, item.entry.endPeriod)}
            </span>
          </div>

          <h3 className="mt-3 text-base font-black text-slate-950">
            {item.entry.unitAssignment.unit.code} · {item.entry.unitAssignment.unit.title}
          </h3>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <UserCheck className="h-3.5 w-3.5" />
              {lecturerName}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {item.entry.room || "No room"}
            </span>
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" />
              {item.entry.unitAssignment.semester.courseYear.title} · {item.entry.unitAssignment.semester.title}
            </span>
          </div>
        </div>

        <div className="grid min-w-[280px] grid-cols-4 gap-2">
          <TinyCount label="P" value={counts.present} tone="emerald" />
          <TinyCount label="A" value={counts.absent} tone="amber" />
          <TinyCount label="L" value={counts.late} tone="sky" />
          <TinyCount label="E" value={counts.excused} tone="slate" />
        </div>
      </div>

      {marked ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100/70 p-3 text-xs font-semibold leading-5 text-slate-600">
          Marked by <span className="font-black text-slate-900">{getUserName(item.session?.takenBy)}</span>. {item.session?.records.length || 0} of {activeStudents} students recorded.
          {item.session?.notes ? <span> Note: {item.session.notes}</span> : null}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
          This lesson has not yet been marked by the assigned lecturer.
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-base font-black text-slate-950">{title}</h2>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[22px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">{helper}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DarkInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 break-words text-xs font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function GuideItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
      <p className="text-xs font-bold leading-5 text-slate-600">{text}</p>
    </div>
  );
}

function MiniStatus({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "slate" | "sky";
}) {
  const styles = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-200 text-slate-700",
    sky: "bg-sky-100 text-sky-700",
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <p className="text-xs font-black text-slate-700">{label}</p>
      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${styles[tone]}`}>{value}</span>
    </div>
  );
}

function TinyCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "slate" | "sky";
}) {
  const styles = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-200 text-slate-700",
    sky: "bg-sky-100 text-sky-700",
  };

  return (
    <div className={`rounded-2xl px-3 py-2 text-center ${styles[tone]}`}>
      <p className="text-[9px] font-black uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="m-5 flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center sm:m-6">
      <ClipboardCheck className="h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm font-black text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">{text}</p>
    </div>
  );
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

function formatTimeRange(startPeriod: number, endPeriod: number) {
  const start = PERIODS.find((period) => period.period === startPeriod)?.time.split(" - ")[0] ?? "";
  const end = PERIODS.find((period) => period.period === endPeriod)?.time.split(" - ")[1] ?? "";
  return `${start} - ${end}`;
}

function getUserName(user?: { firstName: string; lastName: string; email: string } | null) {
  if (!user) return "Not marked";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value || "";
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
