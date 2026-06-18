import type { ElementType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  GraduationCap,
  Layers3,
  MapPin,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAYS = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
] as const;

const PERIODS = [
  { period: 1, block: "Morning", time: "08:20 - 09:20" },
  { period: 2, block: "Morning", time: "09:20 - 10:20" },
  { period: 3, block: "Mid-morning", time: "11:00 - 12:00" },
  { period: 4, block: "Mid-morning", time: "12:00 - 13:00" },
  { period: 5, block: "Afternoon", time: "14:00 - 15:00" },
  { period: 6, block: "Afternoon", time: "15:00 - 16:00" },
] as const;

const DAY_ORDER = new Map<string, number>(
  DAYS.map((day, index) => [day.value, index]),
);

type AcademicDirectorTimetablesPageProps = {
  searchParams?: Promise<{
    intakeId?: string;
    day?: string;
  }>;
};

type IntakeOption = {
  id: string;
  code: string;
  title: string;
  year: number;
  status: string;
  course: { code: string; title: string };
};

type TimetableEntryRecord = {
  id: string;
  dayOfWeek: string;
  startPeriod: number;
  endPeriod: number;
  room: string | null;
  notes: string | null;
  intake: {
    id: string;
    code: string;
    title: string;
    year: number;
    course: { code: string; title: string };
  };
  lecturer: { firstName: string; lastName: string; email: string };
  lecturerAllocation: { allocationRole: string };
  unitAssignment: {
    unit: { code: string; title: string };
    semester: {
      title: string;
      sequence: number;
      courseYear: { title: string; sequence: number };
    };
  };
};

export default async function AcademicDirectorTimetablesPage({
  searchParams,
}: AcademicDirectorTimetablesPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
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
    !currentUser ||
    !currentUser.isActive ||
    currentUser.accountStatus !== "ACTIVE" ||
    !["academic_director", "super_admin"].includes(currentUser.role.name)
  ) {
    redirect("/unauthorized");
  }

  const params = searchParams ? await searchParams : undefined;
  const selectedIntakeId = params?.intakeId?.trim() || "";
  const selectedDay = params?.day?.trim() || "";

  const [intakes, entries] = await Promise.all([
    prisma.intake.findMany({
      orderBy: [{ year: "desc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        title: true,
        year: true,
        status: true,
        course: { select: { code: true, title: true } },
      },
    }),
    prisma.timetableEntry.findMany({
      where: {
        isActive: true,
        ...(selectedIntakeId ? { intakeId: selectedIntakeId } : {}),
        ...(selectedDay ? { dayOfWeek: selectedDay } : {}),
      } as any,
      select: {
        id: true,
        dayOfWeek: true,
        startPeriod: true,
        endPeriod: true,
        room: true,
        notes: true,
        intake: {
          select: {
            id: true,
            code: true,
            title: true,
            year: true,
            course: { select: { code: true, title: true } },
          },
        },
        lecturer: { select: { firstName: true, lastName: true, email: true } },
        lecturerAllocation: { select: { allocationRole: true } },
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
    }),
  ]);

  const typedIntakes = intakes.map((intake) => ({
    ...intake,
    status: String(intake.status),
  })) satisfies IntakeOption[];

  const typedEntries = entries
    .map((entry) => ({
      ...entry,
      dayOfWeek: String(entry.dayOfWeek),
      lecturerAllocation: {
        allocationRole: String(entry.lecturerAllocation.allocationRole),
      },
    }))
    .sort((a, b) => {
      const dayDiff =
        (DAY_ORDER.get(a.dayOfWeek) ?? 99) - (DAY_ORDER.get(b.dayOfWeek) ?? 99);
      if (dayDiff !== 0) return dayDiff;
      if (a.startPeriod !== b.startPeriod) return a.startPeriod - b.startPeriod;
      return a.intake.code.localeCompare(b.intake.code);
    }) satisfies TimetableEntryRecord[];

  const selectedIntake = typedIntakes.find(
    (intake) => intake.id === selectedIntakeId,
  );

  const uniqueIntakes = new Set(typedEntries.map((entry) => entry.intake.id));
  const uniqueLecturers = new Set(
    typedEntries.map((entry) => entry.lecturer.email),
  );
  const uniqueRooms = new Set(
    typedEntries.map((entry) => entry.room?.trim()).filter(Boolean),
  );
  const totalHours = typedEntries.reduce(
    (sum, entry) => sum + (entry.endPeriod - entry.startPeriod + 1),
    0,
  );

  const hasFilters = Boolean(selectedIntakeId || selectedDay);

  const pdfDownloadLink = selectedIntakeId
    ? `/academic-director/timetables/download?intakeId=${selectedIntakeId}`
    : `/academic-director/timetables/download`;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Academic Director
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Timetables
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              View coordinator-created class timetables across all intakes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={pdfDownloadLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-11 items-center justify-center rounded-2xl bg-sky-500/10 px-4 text-xs font-black text-sky-300 ring-1 ring-sky-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-sky-500/20"
            >
              <Download className="mr-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              {selectedIntakeId ? "Download Class PDF" : "Download Master Book"}
            </a>

            <Link
              href="/academic-director/intakes"
              className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Intakes
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Sessions"
          value={typedEntries.length}
          helper="Visible timetable entries"
        />
        <StatCard
          icon={Clock3}
          label="Hours"
          value={totalHours}
          helper="Weekly scheduled hours"
        />
        <StatCard
          icon={Layers3}
          label="Classes"
          value={uniqueIntakes.size}
          helper="Intakes with sessions"
        />
        <StatCard
          icon={UserCheck}
          label="Lecturers"
          value={uniqueLecturers.size}
          helper="Assigned to sessions"
        />
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm">
        <form method="GET" className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700">
              Intake / Class
            </label>
            <select
              name="intakeId"
              defaultValue={selectedIntakeId}
              className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
            >
              <option value="">All intakes (Master View)</option>
              {typedIntakes.map((intake) => (
                <option key={intake.id} value={intake.id}>
                  {intake.code} — {intake.course.code} · {intake.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-700">Day</label>
            <select
              name="day"
              defaultValue={selectedDay}
              className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
            >
              <option value="">All days</option>
              {DAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 self-end sm:flex">
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <Search className="mr-2 h-4 w-4" />
              View
            </button>
            {hasFilters ? (
              <Link
                href="/academic-director/timetables"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-black text-slate-700 transition-all hover:bg-slate-200"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {selectedIntake ? (
            <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
              <SectionHeader
                icon={Layers3}
                title={`${selectedIntake.code} Timetable`}
                subtitle="Read-only weekly grid for the selected intake."
              />
              {typedEntries.length ? (
                <div className="overflow-x-auto p-4 sm:p-5">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[150px_repeat(5,minmax(150px,1fr))] gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-200/70 p-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Periods
                        </p>
                      </div>
                      {DAYS.map((day) => (
                        <div
                          key={day.value}
                          className="rounded-2xl border border-slate-200 bg-slate-200/70 p-3 text-center"
                        >
                          <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                            {day.label}
                          </p>
                        </div>
                      ))}
                      {PERIODS.map((period) => (
                        <TimetableRow
                          key={period.period}
                          period={period}
                          entries={typedEntries}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="No timetable sessions"
                  text="No active timetable entries match the selected intake and day."
                />
              )}
            </section>
          ) : null}

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <SectionHeader
              icon={GraduationCap}
              title="Global Sessions"
              subtitle="All active timetable records created by coordinators."
            />
            {typedEntries.length ? (
              <div className="divide-y divide-slate-200 px-5 sm:px-6">
                {typedEntries.map((entry) => (
                  <SessionRow key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No timetable records"
                text="Timetable sessions will appear after coordinators schedule approved units."
              />
            )}
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">
                  View Rule
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Global oversight only.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <GuideItem text="Academic Director can view all class timetables." />
              <GuideItem text="Coordinators remain responsible for creating sessions." />
              <GuideItem text="Student and lecturer views read the same records." />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
              Current View
            </p>
            <h2 className="mt-2 text-lg font-black tracking-tight">
              {selectedIntake ? selectedIntake.code : "All Timetables"}
            </h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
              {selectedIntake
                ? `${selectedIntake.course.code} — ${selectedIntake.course.title}`
                : "Use filters to inspect one intake timetable."}
            </p>
            <div className="mt-5 space-y-3">
              <DarkInfo
                icon={Layers3}
                label="Classes"
                value={`${uniqueIntakes.size}`}
              />
              <DarkInfo
                icon={Users}
                label="Lecturers"
                value={`${uniqueLecturers.size}`}
              />
              <DarkInfo
                icon={MapPin}
                label="Rooms"
                value={`${uniqueRooms.size}`}
              />
              <DarkInfo icon={Clock3} label="Hours" value={`${totalHours}`} />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Fixed Periods
            </p>
            <div className="mt-4 grid gap-3">
              <MiniPeriod label="Morning" value="08:20 - 10:20" />
              <MiniPeriod label="Mid-morning" value="11:00 - 13:00" />
              <MiniPeriod label="Afternoon" value="14:00 - 16:00" />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function TimetableRow({
  period,
  entries,
}: {
  period: (typeof PERIODS)[number];
  entries: TimetableEntryRecord[];
}) {
  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-sky-700">
          {period.block}
        </p>
        <p className="mt-1 text-sm font-black text-slate-950">
          Period {period.period}
        </p>
        <p className="mt-1 text-[11px] font-bold text-slate-500">
          {period.time}
        </p>
      </div>
      {DAYS.map((day) => {
        const entry = entries.find(
          (item) =>
            item.dayOfWeek === day.value &&
            item.startPeriod <= period.period &&
            item.endPeriod >= period.period,
        );

        return (
          <div
            key={`${day.value}-${period.period}`}
            className="min-h-[126px] rounded-2xl border border-slate-200 bg-slate-100/80 p-3"
          >
            {entry ? (
              period.period === entry.startPeriod ? (
                <TimetableEntryCard entry={entry} />
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-sky-200 bg-sky-50 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-sky-700">
                    Continues · {entry.unitAssignment.unit.code}
                  </p>
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-200/40 p-3 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Free
                </p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function TimetableEntryCard({ entry }: { entry: TimetableEntryRecord }) {
  return (
    <div className="h-full rounded-xl border border-sky-200 bg-sky-50 p-3">
      <p className="font-mono text-[10px] font-black uppercase tracking-wider text-sky-700">
        {entry.unitAssignment.unit.code}
      </p>
      <h3 className="mt-1 line-clamp-2 text-sm font-black leading-5 text-slate-950">
        {entry.unitAssignment.unit.title}
      </h3>
      <p className="mt-2 text-[11px] font-bold leading-4 text-slate-600">
        {entry.unitAssignment.semester.courseYear.title} ·{" "}
        {entry.unitAssignment.semester.title}
      </p>
      <p className="mt-2 text-[11px] font-bold leading-4 text-slate-500">
        {formatLecturerName(entry.lecturer)}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <SmallBadge
          icon={Clock3}
          text={formatSlot(entry.startPeriod, entry.endPeriod)}
        />
        {entry.room ? <SmallBadge icon={MapPin} text={entry.room} /> : null}
      </div>
    </div>
  );
}

function SessionRow({ entry }: { entry: TimetableEntryRecord }) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-5 last:pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[10px] font-black uppercase tracking-wider text-sky-700">
            {formatEnum(entry.dayOfWeek)} ·{" "}
            {formatSlot(entry.startPeriod, entry.endPeriod)}
          </p>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
            {entry.intake.code}
          </span>
        </div>
        <h3 className="mt-1 text-sm font-black text-slate-950">
          {entry.unitAssignment.unit.code} — {entry.unitAssignment.unit.title}
        </h3>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          {entry.intake.course.code} · {entry.intake.title} ·{" "}
          {entry.unitAssignment.semester.courseYear.title} ·{" "}
          {entry.unitAssignment.semester.title}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <SmallBadge icon={Users} text={formatLecturerName(entry.lecturer)} />
        {entry.room ? <SmallBadge icon={MapPin} text={entry.room} /> : null}
      </div>
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

function MiniPeriod({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <p className="text-xs font-black text-slate-700">{label}</p>
      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black text-sky-700">
        {value}
      </span>
    </div>
  );
}

function SmallBadge({ icon: Icon, text }: { icon: ElementType; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
      <Icon className="h-3 w-3 text-sky-700" />
      {text}
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="m-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center sm:m-6">
      <CalendarDays className="h-9 w-9 text-slate-400" />
      <p className="mt-4 text-lg font-black text-slate-800">{title}</p>
      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function formatLecturerName(lecturer: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  return (
    [lecturer.firstName, lecturer.lastName].filter(Boolean).join(" ") ||
    lecturer.email
  );
}

function formatSlot(startPeriod: number, endPeriod: number) {
  const periodTimes: Record<number, string> = {
    1: "08:20 - 09:20",
    2: "09:20 - 10:20",
    3: "11:00 - 12:00",
    4: "12:00 - 13:00",
    5: "14:00 - 15:00",
    6: "15:00 - 16:00",
  };
  if (startPeriod === endPeriod)
    return periodTimes[startPeriod] || `Period ${startPeriod}`;
  const startLabel =
    periodTimes[startPeriod]?.split(" - ")[0] || `P${startPeriod}`;
  const endLabel = periodTimes[endPeriod]?.split(" - ")[1] || `P${endPeriod}`;
  return `${startLabel} - ${endLabel}`;
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
