import type { ElementType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MapPin,
  Save,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  GraduationCap,
  AlertTriangle,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteLecturerAttendanceSession,
  saveLecturerAttendance,
} from "./actions";

export const dynamic = "force-dynamic";

const PERIODS = [
  { period: 1, block: "Morning", time: "08:20 - 09:20" },
  { period: 2, block: "Morning", time: "09:20 - 10:20" },
  { period: 3, block: "Mid-morning", time: "11:00 - 12:00" },
  { period: 4, block: "Mid-morning", time: "12:00 - 13:00" },
  { period: 5, block: "Afternoon", time: "14:00 - 15:00" },
  { period: 6, block: "Afternoon", time: "15:00 - 16:00" },
] as const;

type LecturerAttendancePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type StudentRow = {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
};

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

export default async function LecturerAttendancePage({
  searchParams,
}: LecturerAttendancePageProps) {
  const lecturer = await requireLecturerUser();
  const params = searchParams ? await searchParams : {};
  const requestedEntryId = readParam(params.entryId);
  const requestedDate = readParam(params.date);
  const success = readParam(params.success);
  const error = readParam(params.error);

  const timetableEntries = await prisma.timetableEntry.findMany({
    where: {
      lecturerId: lecturer.id,
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
      intake: {
        select: {
          id: true,
          code: true,
          title: true,
          course: { select: { code: true, title: true } },
        },
      },
      unitAssignment: {
        select: {
          unit: { select: { code: true, title: true } },
          semester: {
            select: {
              title: true,
              sequence: true,
              courseYear: { select: { title: true, sequence: true } },
            },
          },
        },
      },
    },
  });

  const selectedEntry =
    timetableEntries.find((entry) => entry.id === requestedEntryId) ??
    timetableEntries[0] ??
    null;

  const attendanceDate = selectedEntry
    ? requestedDate || getNextDateForDay(String(selectedEntry.dayOfWeek))
    : requestedDate || getTodayDateString();

  const selectedDateObject = parseDateOnly(attendanceDate);
  const isDateMismatch = selectedEntry
    ? !checkDateMatchesDay(attendanceDate, String(selectedEntry.dayOfWeek))
    : false;

  const [students, attendanceSession, totalSessions] = selectedEntry
    ? await Promise.all([
        prisma.student.findMany({
          where: { intakeId: selectedEntry.intake.id, status: "ACTIVE" } as any,
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          select: {
            id: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
            email: true,
            status: true,
          },
        }),
        selectedDateObject
          ? prisma.attendanceSession.findFirst({
              where: {
                timetableEntryId: selectedEntry.id,
                sessionDate: selectedDateObject,
              } as any,
              select: {
                id: true,
                notes: true,
                createdAt: true,
                updatedAt: true,
                takenBy: {
                  select: { firstName: true, lastName: true, email: true },
                },
                records: {
                  select: {
                    id: true,
                    studentId: true,
                    status: true,
                    remarks: true,
                  },
                },
              },
            })
          : Promise.resolve(null),
        prisma.attendanceSession.count({
          where: { timetableEntry: { lecturerId: lecturer.id } } as any,
        }),
      ])
    : ([[], null, 0] as [StudentRow[], null, number]);

  const recordsByStudentId = new Map(
    attendanceSession?.records.map((record) => [record.studentId, record]) ??
      [],
  );

  const presentCount =
    attendanceSession?.records.filter((record) => record.status === "PRESENT")
      .length ?? 0;
  const absentCount =
    attendanceSession?.records.filter((record) => record.status === "ABSENT")
      .length ?? 0;
  const lateCount =
    attendanceSession?.records.filter((record) => record.status === "LATE")
      .length ?? 0;
  const markedCount = attendanceSession?.records.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Lecturer Attendance
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              My Class Attendance
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              Mark attendance only for lessons assigned to you.
            </p>
          </div>
          <Link
            href="/lecturer/timetable"
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            My Timetable
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {success ? <Notice tone="success" message={success} /> : null}
      {error ? <Notice tone="error" message={error} /> : null}

      {/* Stat Cards */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Lessons"
          value={timetableEntries.length}
          helper="Assigned timetable sessions"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Registers"
          value={totalSessions}
          helper="Attendance sessions saved"
        />
        <StatCard
          icon={UserCheck}
          label="Marked"
          value={markedCount}
          helper="Students in selected register"
        />
        <StatCard
          icon={Users}
          label="Students"
          value={students.length}
          helper="Selected class list"
        />
      </section>

      {selectedEntry ? (
        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {/* Selection Form */}
            <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
              <SectionHeader
                icon={CalendarDays}
                title="Select Lesson"
                subtitle="Choose one of your assigned timetable sessions."
              />
              <form
                method="GET"
                className="grid gap-3 p-5 sm:grid-cols-[1fr_180px_auto] sm:p-6"
              >
                <select
                  name="entryId"
                  defaultValue={selectedEntry.id}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
                >
                  {timetableEntries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {formatStatus(String(entry.dayOfWeek))} ·{" "}
                      {formatTimeRange(entry.startPeriod, entry.endPeriod)} ·{" "}
                      {entry.unitAssignment.unit.code} · {entry.intake.code}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  name="date"
                  defaultValue={attendanceDate}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
                />

                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Load Register
                </button>
              </form>
            </section>

            {/* Date Mismatch Warning */}
            {isDateMismatch && (
              <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-800">
                      Date Mismatch Warning
                    </h3>
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      The selected date ({formatDateStandard(attendanceDate)})
                      does not fall on a{" "}
                      {formatStatus(String(selectedEntry.dayOfWeek))}. Are you
                      sure you want to record attendance for this date?
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form action={saveLecturerAttendance} className="space-y-5">
              <input
                type="hidden"
                name="timetableEntryId"
                value={selectedEntry.id}
              />
              <input type="hidden" name="sessionDate" value={attendanceDate} />

              {/* Attendance Table */}
              <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
                <SectionHeader
                  icon={ClipboardCheck}
                  title="Attendance Register"
                  subtitle="Mark students for this taught lesson."
                />
                {students.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-200/50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-5 py-3">Student</th>
                          <th className="px-5 py-3">Admission</th>
                          <th className="px-5 py-3">Status</th>
                          <th className="px-5 py-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {students.map((student) => {
                          const record = recordsByStudentId.get(student.id);
                          return (
                            <tr
                              key={student.id}
                              className="bg-slate-100/40 hover:bg-slate-100/80 transition-colors"
                            >
                              <td className="px-5 py-4">
                                <input
                                  type="hidden"
                                  name="studentId"
                                  value={student.id}
                                />
                                <p className="font-black text-slate-950">
                                  {student.firstName} {student.lastName}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {student.email}
                                </p>
                              </td>
                              <td className="px-5 py-4 font-mono text-xs font-black text-slate-700">
                                {student.admissionNumber}
                              </td>
                              <td className="px-5 py-4">
                                <select
                                  name={`status_${student.id}`}
                                  defaultValue={String(
                                    record?.status || "PRESENT",
                                  )}
                                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-900 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10"
                                >
                                  <option value="PRESENT">Present</option>
                                  <option value="ABSENT">Absent</option>
                                  <option value="LATE">Late</option>
                                  <option value="EXCUSED">Excused</option>
                                </select>
                              </td>
                              <td className="px-5 py-4">
                                <input
                                  type="text"
                                  name={`remarks_${student.id}`}
                                  defaultValue={record?.remarks || ""}
                                  placeholder="Optional"
                                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title="No active students"
                    text="No active students were found for the selected class."
                  />
                )}
              </section>

              {/* Notes & Actions */}
              <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
                <label className="text-xs font-black text-slate-700">
                  Lesson notes
                </label>
                <textarea
                  name="notes"
                  defaultValue={attendanceSession?.notes || ""}
                  rows={3}
                  placeholder="Optional attendance note"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10"
                />

                <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  {attendanceSession ? (
                    <button
                      type="submit"
                      formAction={deleteLecturerAttendanceSession}
                      className="inline-flex h-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-5 text-sm font-black text-amber-700 transition-all hover:-translate-y-0.5 hover:bg-amber-100"
                    >
                      <input
                        type="hidden"
                        name="attendanceSessionId"
                        value={attendanceSession.id}
                      />
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Register
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={students.length === 0}
                    className="group inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                  >
                    <Save className="mr-2 h-5 w-5" />
                    Save Attendance
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </section>
            </form>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
                Selected Lesson
              </p>
              <h2 className="mt-2 text-lg font-black tracking-tight">
                {selectedEntry.unitAssignment.unit.code}
              </h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                {selectedEntry.unitAssignment.unit.title}
              </p>
              <div className="mt-5 space-y-3">
                <DarkInfo
                  icon={CalendarDays}
                  label="Class"
                  value={`${selectedEntry.intake.code} · ${selectedEntry.intake.title}`}
                />
                <DarkInfo
                  icon={Clock3}
                  label="Time"
                  value={`${formatStatus(String(selectedEntry.dayOfWeek))}, ${formatTimeRange(selectedEntry.startPeriod, selectedEntry.endPeriod)}`}
                />
                <DarkInfo
                  icon={GraduationCap}
                  label="Semester"
                  value={`${selectedEntry.unitAssignment.semester.courseYear.title} · ${selectedEntry.unitAssignment.semester.title}`}
                />
                <DarkInfo
                  icon={MapPin}
                  label="Room"
                  value={selectedEntry.room || "Not set"}
                />
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Register Summary
              </p>
              <div className="mt-4 grid gap-3">
                <MiniStatus
                  label="Present"
                  value={presentCount}
                  tone="emerald"
                />
                <MiniStatus label="Absent" value={absentCount} tone="amber" />
                <MiniStatus label="Late" value={lateCount} tone="sky" />
                <MiniStatus label="Marked" value={markedCount} tone="slate" />
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-950">
                    Attendance Rule
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Mark only your own lesson.
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <GuideItem text="Attendance is tied to the timetable lesson." />
                <GuideItem text="The selected date must match the lesson day." />
                <GuideItem text="Coordinator sees the compiled weekly view." />
              </div>
            </section>
          </aside>
        </section>
      ) : (
        <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
          <EmptyState
            title="No lessons assigned"
            text="Attendance will be available after the coordinator schedules your allocated teaching units."
          />
        </section>
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
        <h2 className="truncate text-base font-black text-slate-950">
          {title}
        </h2>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
          {subtitle}
        </p>
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
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </p>
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
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-1 break-words text-xs font-black text-white">
          {value}
        </p>
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
      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${styles[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="m-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center sm:m-6">
      <ClipboardCheck className="h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm font-black text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function Notice({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${styles}`}>
      {message}
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getNextDateForDay(day: string) {
  const dayMap: Record<string, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };
  const today = new Date();
  const target = dayMap[day] ?? today.getDay();
  const current = today.getDay();
  let difference = target - current;
  if (difference <= 0) difference += 7; // Next occurrence or today if it matches

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + difference);
  return nextDate.toISOString().slice(0, 10);
}

function checkDateMatchesDay(dateStr: string, requiredDay: string) {
  const dayMap: Record<string, number> = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return true; // Can't validate
  return dateObj.getDay() === dayMap[requiredDay.toUpperCase()];
}

function formatDateStandard(dateStr: string) {
  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dateObj);
}

function formatTimeRange(startPeriod: number, endPeriod: number) {
  const start =
    PERIODS.find((period) => period.period === startPeriod)?.time.split(
      " - ",
    )[0] ?? "";
  const end =
    PERIODS.find((period) => period.period === endPeriod)?.time.split(
      " - ",
    )[1] ?? "";
  return `${start} - ${end}`;
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
