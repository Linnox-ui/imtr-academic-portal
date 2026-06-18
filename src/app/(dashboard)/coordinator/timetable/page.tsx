import type { ElementType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  GraduationCap,
  Layers3,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";
import { createTimetableEntry, removeTimetableEntry } from "./actions";

export const dynamic = "force-dynamic";

type TimetablePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const DAYS = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
] as const;

const DAY_ORDER = new Map<string, number>(
  DAYS.map((day, index) => [day.value, index]),
);

const PERIODS = [
  { period: 1, block: "Morning", time: "08:20 - 09:20" },
  { period: 2, block: "Morning", time: "09:20 - 10:20" },
  { period: 3, block: "Mid-morning", time: "11:00 - 12:00" },
  { period: 4, block: "Mid-morning", time: "12:00 - 13:00" },
  { period: 5, block: "Afternoon", time: "14:00 - 15:00" },
  { period: 6, block: "Afternoon", time: "15:00 - 16:00" },
] as const;

const SLOT_OPTIONS = [
  ["1-1", "08:20 - 09:20"],
  ["2-2", "09:20 - 10:20"],
  ["1-2", "08:20 - 10:20"],
  ["3-3", "11:00 - 12:00"],
  ["4-4", "12:00 - 13:00"],
  ["3-4", "11:00 - 13:00"],
  ["5-5", "14:00 - 15:00"],
  ["6-6", "15:00 - 16:00"],
  ["5-6", "14:00 - 16:00"],
] as const;

export default async function CoordinatorTimetablePage({
  searchParams,
}: TimetablePageProps) {
  const scope = await requireCoordinatorScope();
  const query = searchParams ? await searchParams : {};
  const success = readParam(query.success);
  const error = readParam(query.error);

  if (scope.isGlobal || !scope.intakeId || !scope.courseId || !scope.intake) {
    return <GlobalNotice />;
  }

  const intakeId = scope.intakeId;
  const courseId = scope.courseId;
  const intake = scope.intake;

  const [approvedAssignments, activeEntries] = await Promise.all([
    prisma.semesterUnitAssignment.findMany({
      where: {
        intakeId,
        status: "APPROVED",
        unit: { courseId },
        semester: { courseYear: { courseId } },
      } as any,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        unit: { select: { code: true, title: true } },
        semester: {
          select: {
            title: true,
            sequence: true,
            courseYear: { select: { title: true, sequence: true } },
          },
        },
        lecturerAllocations: {
          where: { isActive: true },
          orderBy: [{ allocationRole: "asc" }, { startsAt: "desc" }],
          select: {
            id: true,
            allocationRole: true,
            lecturerId: true,
            lecturer: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    }),
    prisma.timetableEntry.findMany({
      where: { intakeId, isActive: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        dayOfWeek: true,
        startPeriod: true,
        endPeriod: true,
        room: true,
        notes: true,
        lecturerId: true,
        lecturer: { select: { firstName: true, lastName: true, email: true } },
        lecturerAllocation: { select: { allocationRole: true } },
        unitAssignment: {
          select: {
            unit: { select: { code: true, title: true } },
            semester: {
              select: {
                title: true,
                sequence: true,
                courseYear: { select: { title: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const availableAllocations = approvedAssignments.flatMap((assignment) =>
    assignment.lecturerAllocations.map((allocation) => ({
      allocationId: allocation.id,
      allocationRole: String(allocation.allocationRole),
      lecturerId: allocation.lecturerId,
      lecturerName: formatName(allocation.lecturer),
      unitCode: assignment.unit.code,
      unitTitle: assignment.unit.title,
      semesterLabel: `${assignment.semester.courseYear.title} · ${assignment.semester.title}`,
    })),
  );

  const sortedEntries = [...activeEntries].sort((a, b) => {
    const dayDiff =
      (DAY_ORDER.get(String(a.dayOfWeek)) ?? 99) -
      (DAY_ORDER.get(String(b.dayOfWeek)) ?? 99);
    if (dayDiff !== 0) return dayDiff;
    return a.startPeriod - b.startPeriod;
  });

  const scheduledPeriods = sortedEntries.reduce(
    (sum, entry) => sum + (entry.endPeriod - entry.startPeriod + 1),
    0,
  );
  const freePeriods = Math.max(
    0,
    DAYS.length * PERIODS.length - scheduledPeriods,
  );
  const activeLecturers = new Set(
    sortedEntries.map((entry) => entry.lecturerId),
  ).size;
  const isLocked = availableAllocations.length === 0;

  const entriesByDay = DAYS.map((day) => ({
    ...day,
    sessions: sortedEntries.filter((e) => String(e.dayOfWeek) === day.value),
  })).filter((day) => day.sessions.length > 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Class Timetable
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {intake.code}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              {intake.title} · {intake.course.code} - {intake.course.title}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {sortedEntries.length ? (
              <a
                href={`/coordinator/timetable/download?intakeId=${intakeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-11 items-center justify-center rounded-2xl bg-sky-500/10 px-4 text-xs font-black text-sky-300 ring-1 ring-sky-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-sky-500/20"
              >
                <Download className="mr-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                Download PDF
              </a>
            ) : null}

            <Link
              href="/coordinator/lecturer-allocation"
              className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Lecturer Allocation
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {success ? <Notice tone="success" message={success} /> : null}
      {error ? <Notice tone="error" message={error} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Sessions"
          value={sortedEntries.length}
          helper="Active timetable entries"
        />
        <StatCard
          icon={Clock3}
          label="Used Periods"
          value={scheduledPeriods}
          helper={`${freePeriods} periods free`}
        />
        <StatCard
          icon={BookOpen}
          label="Ready Units"
          value={availableAllocations.length}
          helper="Approved and allocated"
        />
        <StatCard
          icon={Users}
          label="Lecturers"
          value={activeLecturers}
          helper="Appearing this week"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {sortedEntries.length ? (
            <>
              <section className="hidden xl:block overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
                <SectionHeader
                  icon={CalendarDays}
                  title="Weekly Timetable"
                  subtitle="Monday to Friday with six fixed periods per day."
                />
                <div className="overflow-x-auto p-4 sm:p-5">
                  <div className="min-w-[980px] rounded-[22px] border border-slate-200 bg-slate-200/50 p-3">
                    <div className="grid grid-cols-[150px_repeat(5,1fr)] gap-2">
                      <div className="rounded-2xl bg-slate-900 p-3 text-xs font-black uppercase tracking-wider text-white">
                        Period
                      </div>
                      {DAYS.map((day) => (
                        <div
                          key={day.value}
                          className="rounded-2xl bg-slate-900 p-3 text-center text-xs font-black uppercase tracking-wider text-white"
                        >
                          {day.label}
                        </div>
                      ))}
                      {PERIODS.map((period) => (
                        <TimetableRow
                          key={period.period}
                          period={period}
                          entries={sortedEntries}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="xl:hidden overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
                <SectionHeader
                  icon={Layers3}
                  title="Daily Schedule"
                  subtitle="Assigned intake classes grouped chronologically."
                />
                <div className="space-y-6 p-4 sm:p-5">
                  {entriesByDay.map((day) => (
                    <div key={day.value} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200"></div>
                        <p className="text-xs font-black uppercase tracking-widest text-sky-700">
                          {day.label}
                        </p>
                        <div className="h-px flex-1 bg-slate-200"></div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {day.sessions.map((entry) => (
                          <MobileCoordinatorCard key={entry.id} entry={entry} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <EmptyState
              title="No timetable yet"
              text="Add the first session after units are approved and lecturers are allocated."
            />
          )}

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <SectionHeader
              icon={Plus}
              title="Add Timetable Session"
              subtitle="Choose fixed IMTR periods only. No custom time typing."
            />
            {isLocked ? (
              <LockedPanel />
            ) : (
              <form
                action={createTimetableEntry}
                className="grid gap-4 p-5 sm:p-6"
              >
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700">
                    Unit and lecturer
                  </label>
                  <select
                    required
                    name="lecturerAllocationId"
                    defaultValue=""
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
                  >
                    <option value="" disabled>
                      Select approved unit with lecturer
                    </option>
                    {availableAllocations.map((allocation) => (
                      <option
                        key={allocation.allocationId}
                        value={allocation.allocationId}
                      >
                        {allocation.unitCode} — {allocation.unitTitle} ·{" "}
                        {allocation.lecturerName} (
                        {formatEnum(allocation.allocationRole)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <SelectField
                    label="Day"
                    name="dayOfWeek"
                    defaultValue=""
                    options={DAYS.map((day) => [day.value, day.label] as const)}
                  />
                  <SelectField
                    label="Time slot"
                    name="slot"
                    defaultValue=""
                    options={SLOT_OPTIONS.map(
                      ([value, label]) => [value, label] as const,
                    )}
                  />
                  <InputField
                    label="Room / Venue"
                    name="room"
                    placeholder="Room 4"
                  />
                </div>

                <InputField
                  label="Notes"
                  name="notes"
                  placeholder="Optional note"
                />

                <button
                  type="submit"
                  className="inline-flex h-12 w-fit items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Session
                </button>
              </form>
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
                  Timetable Rules
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Built for IMTR lesson periods.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <GuideItem text="Monday to Friday only." />
              <GuideItem text="Lessons use one period or two consecutive periods." />
              <GuideItem text="Only approved units with lecturers can be scheduled." />
              <GuideItem text="Class, lecturer and room conflicts are blocked." />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
              Fixed Periods
            </p>
            <h2 className="mt-2 text-lg font-black tracking-tight">
              Daily Structure
            </h2>
            <div className="mt-5 space-y-3">
              {PERIODS.map((period) => (
                <DarkPeriod key={period.period} period={period} />
              ))}
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Ready for Timetable
            </p>
            <div className="mt-4 space-y-3">
              {availableAllocations.length ? (
                availableAllocations
                  .slice(0, 8)
                  .map((allocation) => (
                    <ReadyUnit
                      key={allocation.allocationId}
                      allocation={allocation}
                    />
                  ))
              ) : (
                <p className="rounded-2xl border border-amber-200 bg-amber-100 p-3 text-xs font-bold leading-5 text-amber-700">
                  Approve the unit plan and assign lecturers before creating a
                  timetable.
                </p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function MobileCoordinatorCard({ entry }: { entry: any }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-sky-200">
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] font-black uppercase tracking-wider text-sky-700">
            {formatSlot(entry.startPeriod, entry.endPeriod)}
          </p>
          <form action={removeTimetableEntry}>
            <input type="hidden" name="entryId" value={entry.id} />
            <button
              type="submit"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-amber-700 transition-all hover:bg-amber-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
        <h3 className="mt-2 text-sm font-black text-slate-950">
          {entry.unitAssignment.unit.code}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">
          {entry.unitAssignment.unit.title}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="text-[11px] font-bold text-slate-500">
          {formatName(entry.lecturer)}
        </p>
        <div className="flex gap-1.5">
          {entry.room && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600">
              <MapPin className="h-2.5 w-2.5 text-sky-700" /> {entry.room}
            </span>
          )}
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">
            {formatEnum(entry.lecturerAllocation.allocationRole)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TimetableRow({
  period,
  entries,
}: {
  period: (typeof PERIODS)[number];
  entries: any[];
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
            String(item.dayOfWeek) === day.value &&
            item.startPeriod <= period.period &&
            item.endPeriod >= period.period,
        );
        return (
          <div
            key={`${day.value}-${period.period}`}
            className="min-h-[120px] rounded-2xl border border-slate-200 bg-slate-100/80 p-3"
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

function TimetableEntryCard({ entry }: { entry: any }) {
  return (
    <div className="h-full rounded-xl border border-sky-200 bg-sky-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-black uppercase tracking-wider text-sky-700">
            {entry.unitAssignment.unit.code}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm font-black leading-5 text-slate-950">
            {entry.unitAssignment.unit.title}
          </h3>
        </div>
        <form action={removeTimetableEntry}>
          <input type="hidden" name="entryId" value={entry.id} />
          <button
            type="submit"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-amber-700 transition-all hover:-translate-y-0.5 hover:bg-amber-100"
            title="Remove session"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
      <p className="mt-2 text-[11px] font-bold leading-4 text-slate-600">
        {formatName(entry.lecturer)} ·{" "}
        {formatEnum(entry.lecturerAllocation.allocationRole)}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <SmallBadge
          icon={Clock3}
          text={formatSlot(entry.startPeriod, entry.endPeriod)}
        />
        {entry.room ? <SmallBadge icon={MapPin} text={entry.room} /> : null}
      </div>
      {entry.notes && (
        <p className="mt-2 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-500">
          {entry.notes}
        </p>
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black text-slate-700">{label}</label>
      <select
        required
        name={name}
        defaultValue={defaultValue}
        className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
      >
        <option value="" disabled>
          Select {label.toLowerCase()}
        </option>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function InputField({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black text-slate-700">{label}</label>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all placeholder:font-semibold placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
      />
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

function GuideItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
      <p className="text-xs font-bold leading-5 text-slate-600">{text}</p>
    </div>
  );
}

function DarkPeriod({ period }: { period: (typeof PERIODS)[number] }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-300">
        <Clock3 className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          {period.block} · Period {period.period}
        </p>
        <p className="mt-1 text-xs font-black text-white">{period.time}</p>
      </div>
    </div>
  );
}

function ReadyUnit({ allocation }: { allocation: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <p className="font-mono text-[10px] font-black uppercase tracking-wider text-sky-700">
        {allocation.unitCode}
      </p>
      <p className="mt-1 line-clamp-1 text-sm font-black text-slate-950">
        {allocation.unitTitle}
      </p>
      <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">
        {allocation.lecturerName} · {allocation.semesterLabel}
      </p>
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

// ... Keep existing auxiliary presentation elements (LockedPanel, EmptyState, Notice, GlobalNotice, readParam, formatName, formatEnum, formatSlot) ...
function LockedPanel() {
  return (
    <div className="m-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:m-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <h3 className="text-sm font-black text-amber-800">
            Timetable is locked
          </h3>
          <p className="mt-1 text-xs font-bold leading-5 text-amber-700">
            Academic Director must approve the unit plan, then lecturers must be
            allocated before sessions can be created.
          </p>
          <Link
            href="/coordinator/lecturer-allocation"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl bg-amber-100 px-4 text-xs font-black text-amber-800 transition-all hover:-translate-y-0.5"
          >
            Open Lecturer Allocation
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="m-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center sm:m-6">
      <CalendarDays className="h-8 w-8 text-slate-400" />
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

function GlobalNotice() {
  return (
    <div className="rounded-[26px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <h1 className="text-lg font-black text-amber-900">
            Coordinator timetable is intake-scoped
          </h1>
          <p className="mt-1 text-sm font-semibold leading-6 text-amber-800">
            Login as the assigned coordinator lecturer to manage this timetable.
          </p>
        </div>
      </div>
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function formatName(person: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  return (
    [person.firstName, person.lastName].filter(Boolean).join(" ") ||
    person.email
  );
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSlot(startPeriod: number, endPeriod: number) {
  const times: Record<number, string> = {
    1: "08:20-09:20",
    2: "09:20-10:20",
    3: "11:00-12:00",
    4: "12:00-13:00",
    5: "14:00-15:00",
    6: "15:00-16:00",
  };
  if (startPeriod === endPeriod) return times[startPeriod] || `P${startPeriod}`;
  const startLabel = times[startPeriod]?.split("-")[0] || `P${startPeriod}`;
  const endLabel = times[endPeriod]?.split("-")[1] || `P${endPeriod}`;
  return `${startLabel}-${endLabel}`;
}
