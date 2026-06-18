import type { ElementType } from "react";

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers3,
  Users,
} from "lucide-react";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireCoordinatorScope } from "@/lib/coordinator-scope";

export const dynamic = "force-dynamic";

const quickLinks = [
  {
    title: "Class",
    href: "/coordinator/classes",
    icon: CalendarDays,
  },
  {
    title: "Students",
    href: "/coordinator/students",
    icon: Users,
  },
  {
    title: "Course Units",
    href: "/coordinator/course-units",
    icon: Layers3,
  },
  {
    title: "CAT Results",
    href: "/coordinator/results",
    icon: FileText,
  },
] as const;

export default async function CoordinatorHomePage() {
  const scope = await requireCoordinatorScope();

  const studentWhere = scope.isGlobal
    ? {}
    : ({
        intakeId: scope.intakeId,
      } as any);

  const activeStudentWhere = scope.isGlobal
    ? {
        status: "ACTIVE",
      }
    : ({
        intakeId: scope.intakeId,
        status: "ACTIVE",
      } as any);

  const courseUnitWhere = scope.isGlobal
    ? {
        isActive: true,
      }
    : ({
        isActive: true,
        courseId: scope.courseId,
      } as any);

  const [
    totalCourses,
    totalIntakes,
    activeIntakes,
    totalStudents,
    activeStudents,
    activeUnits,
    recentIntakes,
  ] = await Promise.all([
    scope.isGlobal ? prisma.trainingCourse.count() : Promise.resolve(1),

    scope.isGlobal ? prisma.intake.count() : Promise.resolve(1),

    scope.isGlobal
      ? prisma.intake.count({
          where: {
            status: "ACTIVE",
          },
        })
      : Promise.resolve(scope.intake?.status === "ACTIVE" ? 1 : 0),

    prisma.student.count({
      where: studentWhere,
    }),

    prisma.student.count({
      where: activeStudentWhere,
    }),

    prisma.courseUnit.count({
      where: courseUnitWhere,
    }),

    scope.isGlobal
      ? prisma.intake.findMany({
          take: 4,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            code: true,
            title: true,
            year: true,
            status: true,
            course: {
              select: {
                code: true,
                title: true,
              },
            },
          },
        })
      : Promise.resolve(scope.intake ? [scope.intake] : []),
  ]);

  const displayName = scope.user.firstName || "Coordinator";
  const classLabel = scope.isGlobal
    ? "All classes"
    : scope.intake?.code || "Assigned class";

  const courseLabel = scope.isGlobal
    ? `${totalCourses} registered courses`
    : scope.intake?.course.code || "Assigned course";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Course Coordinator
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Welcome, {displayName}
            </h1>

            <p className="mt-2 text-sm font-semibold text-slate-400">
              {scope.isGlobal
                ? "Coordinator overview."
                : `${classLabel} coordination at a glance.`}
            </p>
          </div>

          <Link
            href="/coordinator/classes"
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            Open Class
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          label="Class"
          value={totalIntakes}
          helper={scope.isGlobal ? `${activeIntakes} active` : classLabel}
        />

        <StatCard
          icon={Users}
          label="Students"
          value={totalStudents}
          helper={`${activeStudents} active`}
        />

        <StatCard
          icon={Layers3}
          label="Active Units"
          value={activeUnits}
          helper={courseLabel}
        />

        <StatCard
          icon={GraduationCap}
          label="Access"
          value={scope.isGlobal ? "Global" : "Scoped"}
          helper={scope.isGlobal ? "Super admin view" : "Assigned intake only"}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-5">
          <div className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Attention
                </p>

                <h2 className="mt-1 text-lg font-black text-slate-950">
                  Pending work
                </h2>
              </div>

              <ClipboardCheck className="h-5 w-5 text-sky-700" />
            </div>

            <div className="mt-4 space-y-3">
              <ActionCard
                href="/coordinator/results"
                title="CAT Results"
                value={null}
                helper="Review assigned class results"
                icon={GraduationCap}
              />

              <ActionCard
                href="/coordinator/timetable"
                title="Timetable"
                value={null}
                helper="Review class schedule"
                icon={CalendarDays}
              />

              <ActionCard
                href="/coordinator/attendance"
                title="Attendance"
                value={null}
                helper="Track class participation"
                icon={CheckCircle2}
              />
            </div>
          </div>

          <div className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Quick access
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {quickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex min-h-24 flex-col justify-between rounded-2xl border border-slate-200 bg-slate-200/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-slate-100 hover:shadow-md"
                  >
                    <Icon className="h-5 w-5 text-sky-700" />

                    <span className="mt-4 flex items-center justify-between text-xs font-black text-slate-800">
                      {item.title}

                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Assigned
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950">Class</h2>
            </div>

            <Link
              href="/coordinator/classes"
              className="inline-flex items-center gap-1 text-xs font-black text-sky-700 hover:underline"
            >
              View
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentIntakes.length ? (
            <div className="mt-4 divide-y divide-slate-200">
              {recentIntakes.map((intake) => (
                <Link
                  key={intake.id}
                  href={`/coordinator/classes/${intake.id}`}
                  className="group flex items-center gap-4 py-4 first:pt-1 last:pb-1"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900 transition-colors group-hover:text-sky-700">
                      {intake.code}
                    </p>

                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                      {intake.course.code} · {intake.title}
                    </p>
                  </div>

                  <div className="text-right">
                    <StatusBadge status={String(intake.status)} />

                    <p className="mt-1 text-[10px] font-bold text-slate-400">
                      {intake.year}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 text-center">
              <CalendarDays className="h-7 w-7 text-slate-400" />

              <p className="mt-3 text-sm font-black text-slate-700">
                No assigned class
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BottomLink
          href="/coordinator/results"
          title="CAT Results"
          icon={FileText}
        />

        <BottomLink
          href="/coordinator/reports"
          title="Reports"
          icon={BarChart3}
        />

        <BottomLink
          href="/coordinator/notices"
          title="Notices"
          icon={BookOpen}
        />

        <BottomLink
          href="/coordinator/course-units"
          title="Course Units"
          icon={Layers3}
        />
      </section>
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

function ActionCard({
  href,
  title,
  value,
  helper,
  icon: Icon,
  urgent = false,
}: {
  href: string;
  title: string;
  value: number | null;
  helper: string;
  icon: ElementType;
  urgent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-200/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          urgent ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900">{title}</p>

        <p className="mt-0.5 text-xs font-semibold text-slate-500">{helper}</p>
      </div>

      {value !== null ? (
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-black ${
            urgent
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-300 text-slate-700"
          }`}
        >
          {value}
        </span>
      ) : (
        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
      )}
    </Link>
  );
}

function BottomLink({
  href,
  title,
  icon: Icon,
}: {
  href: string;
  title: string;
  icon: ElementType;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-[22px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-slate-100 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm font-black text-slate-900">{title}</p>
      </div>

      <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    OPEN: "bg-sky-100 text-sky-700",
    PLANNED: "bg-violet-100 text-violet-700",
    COMPLETED: "bg-slate-200 text-slate-700",
    ARCHIVED: "bg-slate-300 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
        styles[status] ?? "bg-slate-200 text-slate-700"
      }`}
    >
      {status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())}
    </span>
  );
}
