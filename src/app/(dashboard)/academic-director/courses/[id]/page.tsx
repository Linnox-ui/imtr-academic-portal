import type { ElementType } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Edit3,
  FileText,
  Layers3,
  Plus,
  Tags,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CourseProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CourseProfilePage({
  params,
}: CourseProfilePageProps) {
  const { id } = await params;

  const course =
    await prisma.trainingCourse.findUnique({
      where: {
        id,
      },
      include: {
        units: {
          orderBy: [
            {
              isActive: "desc",
            },
            {
              code: "asc",
            },
          ],
          select: {
            id: true,
            code: true,
            title: true,
            description: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            intakes: true,
            units: true,
          },
        },
      },
    });

  if (!course) {
    notFound();
  }

  const activeUnits = course.units.filter(
    (unit) => unit.isActive,
  ).length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href="/academic-director/courses"
              aria-label="Back to courses"
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0 animate-in fade-in slide-in-from-left-3 duration-500">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
                {course.code}
              </p>

              <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">
                {course.title}
              </h1>

              <p className="mt-2 text-sm font-semibold text-slate-400">
                {formatEnum(course.category)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/academic-director/course-units/new?course=${course.id}`}
              className="group inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href={`/academic-director/courses/${course.id}/edit`}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-xs font-black text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Code"
          value={course.code}
          helper="Official course code"
        />

        <StatCard
          icon={Tags}
          label="Category"
          value={formatEnum(course.category)}
          helper="Programme group"
        />

        <StatCard
          icon={Layers3}
          label="Units"
          value={`${course._count.units}`}
          helper={`${activeUnits} active`}
        />

        <StatCard
          icon={CalendarDays}
          label="Intakes"
          value={`${course._count.intakes}`}
          helper="Linked cohorts"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Notes
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950">
                Description
              </h2>
            </div>
          </div>

          <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-200/50 p-4 text-sm font-semibold leading-7 text-slate-600">
            {course.description ||
              "No description has been added for this course."}
          </p>

          <div className="mt-5 rounded-2xl bg-slate-900 p-4 text-white">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
              Created
            </p>

            <p className="mt-2 text-sm font-black">
              {formatDate(course.createdAt)}
            </p>
          </div>
        </div>

        <div className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Layers3 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Course units
                </p>

                <h2 className="mt-1 text-lg font-black text-slate-950">
                  Linked units
                </h2>
              </div>
            </div>

            <Link
              href={`/academic-director/course-units/new?course=${course.id}`}
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Link>
          </div>

          {course.units.length === 0 ? (
            <EmptyUnits
              courseId={course.id}
            />
          ) : (
            <div className="mt-5 grid gap-3">
              {course.units.map((unit) => (
                <UnitCard
                  key={unit.id}
                  unit={unit}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/academic-director/courses"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-black text-slate-700 transition-all hover:bg-slate-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Courses
        </Link>

        <Link
          href={`/academic-director/courses/${course.id}/edit`}
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <Edit3 className="mr-2 h-4 w-4" />
          Edit Course
        </Link>
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
  value: string;
  helper: string;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[22px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm duration-500">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-xl font-black tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-[11px] font-bold text-slate-500">
            {helper}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function UnitCard({
  unit,
}: {
  unit: {
    id: string;
    code: string;
    title: string;
    description: string | null;
    isActive: boolean;
  };
}) {
  return (
    <Link
      href={`/academic-director/course-units/${unit.id}`}
      className="group flex gap-4 rounded-2xl border border-slate-200 bg-slate-200/50 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-slate-100 hover:shadow-md"
    >
      <div
        className={`mt-1 h-3 w-3 shrink-0 rounded-full ${
          unit.isActive ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
              {unit.code}
            </p>

            <h3 className="mt-1 line-clamp-1 text-sm font-black text-slate-950 transition-colors group-hover:text-sky-700">
              {unit.title}
            </h3>
          </div>

          <StatusBadge
            active={unit.isActive}
          />
        </div>

        <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
          {unit.description || "No description provided."}
        </p>
      </div>

      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function EmptyUnits({
  courseId,
}: {
  courseId: string;
}) {
  return (
    <div className="mt-5 flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center">
      <Layers3 className="h-8 w-8 text-slate-400" />

      <p className="mt-3 text-sm font-black text-slate-700">
        No units yet
      </p>

      <Link
        href={`/academic-director/course-units/new?course=${courseId}`}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add First Unit
      </Link>
    </div>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-300 text-slate-700"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
