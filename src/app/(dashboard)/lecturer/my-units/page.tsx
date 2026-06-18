import type { ElementType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UnitAssignmentStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  FileText,
  GraduationCap,
  Layers3,
  UserCheck,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

type LecturerAllocation = {
  id: string;
  allocationRole: string;
  startsAt: Date;
  intake: {
    id: string;
    code: string;
    title: string;
    year: number;
    status: string;
    course: { id: string; code: string; title: string; category: string };
  };
  unitAssignment: {
    id: string;
    unit: {
      id: string;
      code: string;
      title: string;
      description: string | null;
    };
    semester: {
      id: string;
      title: string;
      semesterNumber: number | null;
      periodType: string;
      courseYear: {
        id: string;
        title: string;
        yearNumber: number;
        sequence: number;
      };
    };
  };
};

type WorkspaceGroup = {
  key: string;
  course: { id: string; code: string; title: string; category: string };
  intake: {
    id: string;
    code: string;
    title: string;
    year: number;
    status: string;
  };
  allocations: LecturerAllocation[];
};

export default async function LecturerMyUnitsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/unauthorized");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      role: { select: { name: true } },
    },
  });

  if (
    !currentUser ||
    !currentUser.isActive ||
    currentUser.role.name !== "lecturer"
  ) {
    redirect("/unauthorized");
  }

  const allocationRecords = await prisma.lecturerUnitAllocation.findMany({
    where: {
      lecturerId: currentUser.id,
      isActive: true,
      unitAssignment: {
        status: UnitAssignmentStatus.APPROVED,
        unit: { isActive: true },
        semester: { isActive: true, courseYear: { isActive: true } },
      },
    },
    select: {
      id: true,
      allocationRole: true,
      startsAt: true,
      intake: {
        select: {
          id: true,
          code: true,
          title: true,
          year: true,
          status: true,
          course: {
            select: { id: true, code: true, title: true, category: true },
          },
        },
      },
      unitAssignment: {
        select: {
          id: true,
          unit: {
            select: { id: true, code: true, title: true, description: true },
          },
          semester: {
            select: {
              id: true,
              title: true,
              semesterNumber: true,
              periodType: true,
              courseYear: {
                select: {
                  id: true,
                  title: true,
                  yearNumber: true,
                  sequence: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const allocations: LecturerAllocation[] = allocationRecords.map(
    (allocation) => ({
      id: allocation.id,
      allocationRole: String(allocation.allocationRole),
      startsAt: allocation.startsAt,
      intake: {
        id: allocation.intake.id,
        code: allocation.intake.code,
        title: allocation.intake.title,
        year: allocation.intake.year,
        status: String(allocation.intake.status),
        course: {
          id: allocation.intake.course.id,
          code: allocation.intake.course.code,
          title: allocation.intake.course.title,
          category: String(allocation.intake.course.category),
        },
      },
      unitAssignment: {
        id: allocation.unitAssignment.id,
        unit: {
          id: allocation.unitAssignment.unit.id,
          code: allocation.unitAssignment.unit.code,
          title: allocation.unitAssignment.unit.title,
          description: allocation.unitAssignment.unit.description,
        },
        semester: {
          id: allocation.unitAssignment.semester.id,
          title: allocation.unitAssignment.semester.title,
          semesterNumber: allocation.unitAssignment.semester.semesterNumber,
          periodType: String(allocation.unitAssignment.semester.periodType),
          courseYear: {
            id: allocation.unitAssignment.semester.courseYear.id,
            title: allocation.unitAssignment.semester.courseYear.title,
            yearNumber:
              allocation.unitAssignment.semester.courseYear.yearNumber,
            sequence: allocation.unitAssignment.semester.courseYear.sequence,
          },
        },
      },
    }),
  );

  allocations.sort((first, second) => {
    const courseComparison = first.intake.course.title.localeCompare(
      second.intake.course.title,
    );
    if (courseComparison !== 0) return courseComparison;

    const intakeComparison = second.intake.year - first.intake.year;
    if (intakeComparison !== 0) return intakeComparison;

    const yearComparison =
      first.unitAssignment.semester.courseYear.sequence -
      second.unitAssignment.semester.courseYear.sequence;
    if (yearComparison !== 0) return yearComparison;

    const firstSemesterNumber =
      first.unitAssignment.semester.semesterNumber ?? 999;
    const secondSemesterNumber =
      second.unitAssignment.semester.semesterNumber ?? 999;
    if (firstSemesterNumber !== secondSemesterNumber)
      return firstSemesterNumber - secondSemesterNumber;

    return first.unitAssignment.unit.code.localeCompare(
      second.unitAssignment.unit.code,
    );
  });

  const groupsMap = new Map<string, WorkspaceGroup>();
  for (const allocation of allocations) {
    const key = `${allocation.intake.course.id}-${allocation.intake.id}`;
    const existingGroup = groupsMap.get(key);
    if (existingGroup) {
      existingGroup.allocations.push(allocation);
      continue;
    }
    groupsMap.set(key, {
      key,
      course: {
        id: allocation.intake.course.id,
        code: allocation.intake.course.code,
        title: allocation.intake.course.title,
        category: allocation.intake.course.category,
      },
      intake: {
        id: allocation.intake.id,
        code: allocation.intake.code,
        title: allocation.intake.title,
        year: allocation.intake.year,
        status: allocation.intake.status,
      },
      allocations: [allocation],
    });
  }

  const groups = Array.from(groupsMap.values());
  const primaryAllocations = allocations.filter(
    (a) => a.allocationRole === "PRIMARY",
  ).length;
  const supportingAllocations = allocations.length - primaryAllocations;
  const courseCount = new Set(allocations.map((a) => a.intake.course.id)).size;
  const intakeCount = new Set(allocations.map((a) => a.intake.id)).size;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Lecturer Workspace
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              My Teaching Units
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              Welcome, {currentUser.firstName}. View your active intake-specific
              teaching allocations and approved units.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <HeroStat title="Units" value={allocations.length} />
            <HeroStat title="Intakes" value={intakeCount} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          title="Assigned Courses"
          value={`${courseCount}`}
          helper="Courses with active duties"
        />
        <StatCard
          icon={CalendarRange}
          title="Assigned Intakes"
          value={`${intakeCount}`}
          helper="Student cohorts"
        />
        <StatCard
          icon={UserCheck}
          title="Primary Units"
          value={`${primaryAllocations}`}
          helper="Primary lecturer role"
        />
        <StatCard
          icon={Users}
          title="Supporting Units"
          value={`${supportingAllocations}`}
          helper="Co-lecturer or assistant"
        />
      </section>

      <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-950">
                Active Allocations
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                Only approved and currently active unit allocations are
                displayed.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
            {allocations.length} Active
          </span>
        </div>

        {groups.length === 0 ? (
          <EmptyLecturerWorkspace />
        ) : (
          <div className="space-y-6 p-4 sm:p-5">
            {groups.map((group) => (
              <CourseIntakeGroup key={group.key} group={group} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <p className="font-black text-emerald-900">
              Allocation-based access
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-emerald-800">
              You can only see units actively allocated to your lecturer
              account. Ended allocations and unapproved units are excluded.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CourseIntakeGroup({ group }: { group: WorkspaceGroup }) {
  return (
    <article className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-sky-700">
                {group.course.code} • {formatEnum(group.course.category)}
              </p>
              <h3 className="mt-1 break-words text-base font-black text-slate-950">
                {group.course.title}
              </h3>
              <p className="mt-0.5 break-words text-xs font-semibold text-slate-500">
                {group.intake.code} — {group.intake.title}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <InfoBadge icon={CalendarDays} text={`${group.intake.year}`} />
            <InfoBadge
              icon={Layers3}
              text={`${group.allocations.length} unit${group.allocations.length === 1 ? "" : "s"}`}
            />
            <Link
              href={`/lecturer/my-units/${group.course.id}/curriculum`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <BookOpen className="h-4 w-4" /> Curriculum
            </Link>
          </div>
        </div>
      </div>
      <div className="grid min-w-0 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {group.allocations.map((allocation) => (
          <TeachingUnitCard key={allocation.id} allocation={allocation} />
        ))}
      </div>
    </article>
  );
}

function TeachingUnitCard({ allocation }: { allocation: LecturerAllocation }) {
  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50/50 p-4 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md">
      <div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 px-1 text-center text-[10px] font-black text-sky-700">
            {allocation.unitAssignment.unit.code.slice(0, 5).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-black text-slate-950 transition-colors group-hover:text-sky-700">
              {allocation.unitAssignment.unit.title}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-sky-700">
              {allocation.unitAssignment.unit.code}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <RoleBadge role={allocation.allocationRole} />
        </div>

        <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
          <DetailRow
            label="Academic Year"
            value={allocation.unitAssignment.semester.courseYear.title}
          />
          <DetailRow
            label="Semester"
            value={allocation.unitAssignment.semester.title}
          />
          <DetailRow
            label="Period Type"
            value={formatEnum(allocation.unitAssignment.semester.periodType)}
          />
        </div>

        <p className="mt-3 line-clamp-2 text-[11px] font-semibold leading-5 text-slate-500">
          {allocation.unitAssignment.unit.description ||
            "No unit description provided."}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
        <Link
          href={`/lecturer/results?allocationId=${allocation.id}`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 text-[11px] font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <FileText className="h-3.5 w-3.5" />
          CAT Results
        </Link>

        {/* Activated Attendance Link */}
        <Link
          href={`/lecturer/attendance`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-sky-100 px-3 text-[11px] font-black text-sky-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-sky-200"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Attendance
        </Link>
      </div>
    </article>
  );
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    PRIMARY: "border-emerald-200 bg-emerald-100 text-emerald-700",
    CO_LECTURER: "border-sky-200 bg-sky-100 text-sky-700",
    ASSISTANT: "border-violet-200 bg-violet-100 text-violet-700",
  };
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        styles[role] || "border-slate-200 bg-slate-100 text-slate-700"
      }`}
    >
      {formatEnum(role)}
    </span>
  );
}

function InfoBadge({ icon: Icon, text }: { icon: ElementType; text: string }) {
  return (
    <span className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm">
      <Icon className="h-3.5 w-3.5 text-sky-600" /> {text}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[11px]">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="text-right font-black text-slate-950">{value}</span>
    </div>
  );
}

function HeroStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="min-w-[100px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-sky-300">
        {title}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  helper,
}: {
  icon: ElementType;
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[22px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {title}
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

function EmptyLecturerWorkspace() {
  return (
    <div className="px-5 py-16 text-center border-t border-slate-200">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-slate-200/50 text-slate-400">
        <GraduationCap className="h-8 w-8" />
      </div>
      <p className="mt-5 text-lg font-black text-slate-950">
        No active teaching units
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">
        Approved units assigned to your lecturer account by a course coordinator
        will appear here.
      </p>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
