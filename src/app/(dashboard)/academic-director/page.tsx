import type { ElementType } from "react";

import { ResultWorkflowStatus } from "@prisma/client";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const quickLinks = [
  {
    title: "Courses",
    href: "/academic-director/courses",
    icon: BookOpen,
  },
  {
    title: "Intakes",
    href: "/academic-director/intakes",
    icon: CalendarDays,
  },
  {
    title: "Students",
    href: "/academic-director/students",
    icon: Users,
  },
  {
    title: "Course Units",
    href: "/academic-director/course-units",
    icon: Layers3,
  },
] as const;

export default async function AcademicDirectorHomePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      firstName: true,
      lastName: true,
      isActive: true,
      accountStatus: true,
      role: {
        select: {
          name: true,
        },
      },
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

  const [
    totalCourses,
    totalIntakes,
    activeIntakes,
    totalStudents,
    activeStudents,
    activeUnits,
    pendingResults,
    recentIntakes,
  ] = await Promise.all([
    prisma.trainingCourse.count(),

    prisma.intake.count(),

    prisma.intake.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.student.count(),

    prisma.student.count({
      where: {
        status: "ACTIVE",
      },
    }),

    prisma.courseUnit.count({
      where: {
        isActive: true,
      },
    }),

    prisma.resultSubmission.count({
      where: {
        status: ResultWorkflowStatus.SUBMITTED_TO_ACADEMIC_DIRECTOR,
      },
    }),

    prisma.intake.findMany({
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
    }),
  ]);

  const displayName = currentUser.firstName || "Academic Director";

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
              Welcome, {displayName}
            </h1>

            <p className="mt-2 text-sm font-semibold text-slate-400">
              Academic operations at a glance.
            </p>
          </div>

          <Link
            href="/academic-director/students/new"
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Student
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Courses"
          value={totalCourses}
          helper="Registered courses"
        />

        <StatCard
          icon={CalendarDays}
          label="Intakes"
          value={totalIntakes}
          helper={`${activeIntakes} active`}
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
          helper="Course catalog"
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
                href="/academic-director/results-review"
                title="Results Review"
                value={pendingResults}
                helper="Waiting for approval"
                icon={GraduationCap}
                urgent={pendingResults > 0}
              />

              <ActionCard
                href="/academic-director/unit-approvals"
                title="Unit Approvals"
                value={null}
                helper="Review submitted structures"
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
                Recent
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950">
                Intakes
              </h2>
            </div>

            <Link
              href="/academic-director/intakes"
              className="inline-flex items-center gap-1 text-xs font-black text-sky-700 hover:underline"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentIntakes.length ? (
            <div className="mt-4 divide-y divide-slate-200">
              {recentIntakes.map((intake) => (
                <Link
                  key={intake.id}
                  href={`/academic-director/intakes/${intake.id}`}
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
                    <StatusBadge status={intake.status} />

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
                No intakes yet
              </p>

              <Link
                href="/academic-director/intakes/new"
                className="mt-3 inline-flex items-center gap-1 text-xs font-black text-sky-700 hover:underline"
              >
                Create intake
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
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
  value: number;
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
