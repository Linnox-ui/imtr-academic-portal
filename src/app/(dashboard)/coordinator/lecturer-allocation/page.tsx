import type { ElementType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  History,
  Layers3,
  Mail,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";

import { assignLecturerToUnit, endLecturerAllocation } from "./actions";
import { DownloadRosterPdf } from "./download-roster-pdf";

export const dynamic = "force-dynamic";

type LecturerAllocationPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CoordinatorLecturerAllocationPage({
  searchParams,
}: LecturerAllocationPageProps) {
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

  const [approvedAssignments, pendingAssignments, lecturers, recentHistory] =
    await Promise.all([
      prisma.semesterUnitAssignment.findMany({
        where: {
          intakeId,
          status: "APPROVED",
          unit: { courseId },
          semester: { courseYear: { courseId } },
        } as any,
        orderBy: [
          { semester: { courseYear: { sequence: "asc" } } },
          { semester: { sequence: "asc" } },
          { unit: { code: "asc" } },
        ],
        select: {
          id: true,
          status: true,
          unit: {
            select: { id: true, code: true, title: true, description: true },
          },
          semester: {
            select: {
              id: true,
              title: true,
              semesterNumber: true,
              sequence: true,
              periodType: true,
              courseYear: {
                select: { yearNumber: true, title: true, sequence: true },
              },
            },
          },
          lecturerAllocations: {
            where: { isActive: true },
            orderBy: { startsAt: "desc" },
            select: {
              id: true,
              allocationRole: true,
              startsAt: true,
              changeReason: true,
              lecturer: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      }),

      prisma.semesterUnitAssignment.count({
        where: { intakeId, status: { not: "APPROVED" } } as any,
      }),

      prisma.user.findMany({
        where: {
          isActive: true,
          accountStatus: "ACTIVE",
          role: { name: "lecturer" },
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: { id: true, firstName: true, lastName: true, email: true },
      }),

      prisma.lecturerUnitAllocation.findMany({
        where: { intakeId },
        take: 8,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          allocationRole: true,
          isActive: true,
          startsAt: true,
          endsAt: true,
          changeReason: true,
          lecturer: {
            select: { firstName: true, lastName: true, email: true },
          },
          unitAssignment: {
            select: {
              unit: { select: { code: true, title: true } },
              semester: {
                select: {
                  title: true,
                  courseYear: { select: { title: true } },
                },
              },
            },
          },
        },
      }),
    ]);

  const allocatedUnits = approvedAssignments.filter(
    (assignment) => assignment.lecturerAllocations.length > 0,
  ).length;
  const unallocatedUnits = approvedAssignments.length - allocatedUnits;
  const isLocked = approvedAssignments.length === 0;

  // Flatten active allocations for the roster table
  const allActiveAllocationsList = approvedAssignments
    .flatMap((assignment) =>
      assignment.lecturerAllocations.map((allocation) => ({
        unit: assignment.unit,
        semester: assignment.semester,
        allocation,
      })),
    )
    .sort((a, b) => a.unit.code.localeCompare(b.unit.code));
  // 2. Map data for the PDF Export
  const pdfRosterData = allActiveAllocationsList.map(
    ({ unit, allocation }) => ({
      lecturerName: formatPerson(allocation.lecturer),
      email: allocation.lecturer.email,
      unitCode: unit.code,
      unitTitle: unit.title,
      role: formatEnum(allocation.allocationRole),
      assignedOn: formatDate(allocation.startsAt),
    }),
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Lecturer Allocation
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {intake.code}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              Assign lecturers to approved units for {intake.course.code} —{" "}
              {intake.course.title}.
            </p>
          </div>

          <Link
            href="/coordinator/course-units"
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            Course Units
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      {success ? <Notice tone="success" message={success} /> : null}
      {error ? <Notice tone="error" message={error} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Approved Units"
          value={approvedAssignments.length}
          helper="Ready for lecturers"
        />
        <StatCard
          icon={UserCheck}
          label="Allocated"
          value={allocatedUnits}
          helper="Have active lecturer"
        />
        <StatCard
          icon={AlertTriangle}
          label="Unallocated"
          value={unallocatedUnits}
          helper="Still need lecturer"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Pending Plan"
          value={pendingAssignments}
          helper="Not yet approved"
        />
      </section>

      {isLocked ? (
        <LockedPanel />
      ) : (
        <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {/* ALLOCATION CARDS */}
            <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <SectionHeader
                icon={Users}
                title="Assign Lecturers"
                subtitle="Only approved units from your assigned intake are shown."
              />

              <div className="grid gap-5 p-5 sm:p-6 bg-slate-50/50">
                {approvedAssignments.map((assignment) => (
                  <UnitAllocationCard
                    key={assignment.id}
                    assignment={assignment}
                    lecturers={lecturers}
                  />
                ))}
              </div>
            </section>

            {/* CONSOLIDATED ROSTER TABLE */}
            <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-slate-950">
                      Active Lecturer Roster
                    </h2>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                      A consolidated view of all units and their currently
                      assigned lecturers.
                    </p>
                  </div>
                </div>

                {pdfRosterData.length > 0 && (
                  <div className="flex shrink-0">
                    <DownloadRosterPdf
                      roster={pdfRosterData}
                      intakeCode={intake.code}
                    />
                  </div>
                )}
              </div>

              {allActiveAllocationsList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-4">Lecturer</th>
                        <th className="px-5 py-4">Unit</th>
                        <th className="px-5 py-4">Role</th>
                        <th className="px-5 py-4 text-right">Assigned On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allActiveAllocationsList.map(({ unit, allocation }) => (
                        <tr
                          key={allocation.id}
                          className="transition-colors hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-3">
                            <p className="font-black text-slate-900">
                              {formatPerson(allocation.lecturer)}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              {allocation.lecturer.email}
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-black text-slate-900">
                              {unit.code}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">
                              {unit.title}
                            </p>
                          </td>
                          <td className="px-5 py-3">
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                              {formatEnum(allocation.allocationRole)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <p className="text-xs font-bold text-slate-700">
                              {formatDate(allocation.startsAt)}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="m-5 flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center sm:m-6">
                  <p className="text-sm font-black text-slate-700">
                    No active allocations
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Assign a lecturer above to populate this roster.
                  </p>
                </div>
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
                    Allocation Rule
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Approval comes first.
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <GuideItem text="Only approved units can receive lecturers." />
                <GuideItem text="Replacing a lecturer keeps the old allocation as history." />
                <GuideItem text="Other intakes remain hidden from this workspace." />
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
                Assigned Class
              </p>
              <h2 className="mt-2 text-lg font-black tracking-tight">
                {intake.code}
              </h2>
              <div className="mt-5 space-y-3">
                <DarkInfo
                  icon={CalendarDays}
                  label="Year"
                  value={`${intake.year}`}
                />
                <DarkInfo
                  icon={GraduationCap}
                  label="Course"
                  value={`${intake.course.code} — ${intake.course.title}`}
                />
                <DarkInfo
                  icon={Users}
                  label="Lecturers"
                  value={`${lecturers.length} active accounts`}
                />
              </div>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-950">
                    Recent History
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-slate-500">
                    Last allocation changes.
                  </p>
                </div>
              </div>

              {recentHistory.length ? (
                <div className="mt-4 space-y-3">
                  {recentHistory.map((item) => (
                    <HistoryItem key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs font-bold leading-5 text-slate-500 text-center">
                  No lecturer allocations have been made for this intake yet.
                </p>
              )}
            </section>
          </aside>
        </section>
      )}
    </div>
  );
}

function GlobalNotice() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
            Lecturer Allocation
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Intake Scope Required
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
            Lecturer allocation is handled from a coordinator’s assigned intake
            workspace.
          </p>
        </div>
      </section>
    </div>
  );
}

function UnitAllocationCard({
  assignment,
  lecturers,
}: {
  assignment: {
    id: string;
    unit: { code: string; title: string; description: string | null };
    semester: {
      title: string;
      periodType: string;
      courseYear: { yearNumber: number; title: string };
    };
    lecturerAllocations: {
      id: string;
      allocationRole: string;
      startsAt: Date;
      changeReason: string | null;
      lecturer: { firstName: string; lastName: string; email: string };
    }[];
  };
  lecturers: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }[];
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-sky-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
              Approved
            </span>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-sky-700">
              {assignment.semester.courseYear.title} ·{" "}
              {assignment.semester.title}
            </span>
          </div>

          <h3 className="mt-3 text-lg font-black leading-6 text-slate-950">
            {assignment.unit.code} — {assignment.unit.title}
          </h3>

          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
            {assignment.unit.description || "No unit description provided."}
          </p>
        </div>

        <div className="shrink-0 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-black text-slate-700">
          {assignment.lecturerAllocations.length} active
        </div>
      </div>

      {assignment.lecturerAllocations.length ? (
        <div className="mt-5 grid gap-3">
          {assignment.lecturerAllocations.map((allocation) => (
            <ActiveAllocation key={allocation.id} allocation={allocation} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black text-amber-700">
            No lecturer assigned yet
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-amber-700/80">
            Assign a lecturer before creating assessments or timetable entries
            for this unit.
          </p>
        </div>
      )}

      <form
        action={assignLecturerToUnit as any}
        className="mt-5 grid gap-3 rounded-[20px] border border-slate-100 bg-slate-50 p-4 lg:grid-cols-[1fr_160px_1fr_auto]"
      >
        <input type="hidden" name="unitAssignmentId" value={assignment.id} />

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Lecturer
          </label>
          <select
            required
            name="lecturerId"
            defaultValue=""
            disabled={lecturers.length === 0}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
          >
            <option value="" disabled>
              Select lecturer
            </option>
            {lecturers.map((lecturer) => (
              <option key={lecturer.id} value={lecturer.id}>
                {formatPerson(lecturer)} — {lecturer.email}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Role
          </label>
          <select
            name="allocationRole"
            defaultValue="PRIMARY"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10"
          >
            <option value="PRIMARY">Primary</option>
            <option value="CO_LECTURER">Co-Lecturer</option>
            <option value="ASSISTANT">Assistant</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Note
          </label>
          <input
            name="changeReason"
            placeholder="Optional reason"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-xs font-black text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10"
          />
        </div>

        <button
          type="submit"
          disabled={lecturers.length === 0}
          className="inline-flex h-11 items-center justify-center self-end rounded-xl bg-slate-900 px-5 text-xs font-black text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
        >
          Assign
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function ActiveAllocation({
  allocation,
}: {
  allocation: {
    id: string;
    allocationRole: string;
    startsAt: Date;
    changeReason: string | null;
    lecturer: { firstName: string; lastName: string; email: string };
  };
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-sky-100 bg-sky-50/50 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-sm font-black text-white shadow-sm">
          {getInitials(
            allocation.lecturer.firstName,
            allocation.lecturer.lastName,
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-black text-slate-950">
              {formatPerson(allocation.lecturer)}
            </p>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
              {formatEnum(allocation.allocationRole)}
            </span>
          </div>

          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Mail className="h-3.5 w-3.5" />
            {allocation.lecturer.email}
          </p>

          <p className="mt-1 text-[10px] font-bold text-slate-400">
            Active since {formatDate(allocation.startsAt)}
          </p>
        </div>
      </div>

      <form action={endLecturerAllocation as any} className="flex gap-2">
        <input type="hidden" name="allocationId" value={allocation.id} />
        <input
          type="hidden"
          name="changeReason"
          value="Ended by coordinator from lecturer allocation page."
        />
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-[10px] font-black uppercase tracking-wider text-amber-700 transition-all hover:-translate-y-0.5 hover:bg-amber-100"
        >
          <XCircle className="mr-1.5 h-3.5 w-3.5" />
          End Role
        </button>
      </form>
    </div>
  );
}

function LockedPanel() {
  return (
    <section className="overflow-hidden rounded-[26px] border border-amber-200 bg-amber-50 shadow-sm">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
          <ShieldCheck className="h-7 w-7" />
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
            Locked
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            Unit plan approval required
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-amber-800/80">
            Lecturer allocation opens only after the Academic Director approves
            the coordinator’s unit plan.
          </p>
        </div>

        <Link
          href="/coordinator/course-units"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
        >
          View Unit Plan
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </section>
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
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
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
    <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm duration-500">
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
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
      <p className="text-xs font-bold leading-5 text-slate-600">{text}</p>
    </div>
  );
}

function HistoryItem({
  item,
}: {
  item: {
    allocationRole: string;
    isActive: boolean;
    startsAt: Date;
    endsAt: Date | null;
    lecturer: { firstName: string; lastName: string; email: string };
    unitAssignment: {
      unit: { code: string; title: string };
      semester: { title: string; courseYear: { title: string } };
    };
  };
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${item.isActive ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-black text-slate-950">
            {item.unitAssignment.unit.code} · {formatPerson(item.lecturer)}
          </p>
          <p className="mt-1 truncate text-[10px] font-bold text-slate-500">
            {formatEnum(item.allocationRole)} ·{" "}
            {item.unitAssignment.semester.courseYear.title}{" "}
            {item.unitAssignment.semester.title}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wider ${
            item.isActive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {item.isActive ? "Active" : "Ended"}
        </span>
      </div>
      <p className="mt-2 text-[10px] font-bold text-slate-400">
        {formatDate(item.startsAt)}
        {item.endsAt ? ` — ${formatDate(item.endsAt)}` : ""}
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

function formatPerson(person: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  return (
    [person.firstName, person.lastName].filter(Boolean).join(" ") ||
    person.email
  );
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}
