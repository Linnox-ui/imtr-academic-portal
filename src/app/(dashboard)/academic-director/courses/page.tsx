import type { ElementType } from "react";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Layers3,
  Plus,
  Tags,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getCourses() {
  return prisma.trainingCourse.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          intakes: true,
        },
      },
    },
  });
}

type CourseRow = Awaited<
  ReturnType<typeof getCourses>
>[number];

export default async function CourseRegistryPage() {
  const courses = await getCourses();

  const categoryCount = new Set(
    courses.map(
      (course) => course.category,
    ),
  ).size;

  const totalIntakes = courses.reduce(
    (total, course) =>
      total + course._count.intakes,
    0,
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Academic Director
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Courses
            </h1>

            <p className="mt-2 text-sm font-semibold text-slate-400">
              Programme catalog and linked intakes.
            </p>
          </div>

          <Link
            href="/academic-director/courses/new"
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Course
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={BookOpen}
          label="Courses"
          value={courses.length}
          helper="Registered programmes"
        />

        <StatCard
          icon={Tags}
          label="Categories"
          value={categoryCount}
          helper="Programme groups"
        />

        <StatCard
          icon={CalendarDays}
          label="Intakes"
          value={totalIntakes}
          helper="Linked cohorts"
        />
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Registry
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-950">
              Course catalog
            </h2>
          </div>

          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
            {courses.length}
          </span>
        </div>

        {courses.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CourseCard({
  course,
}: {
  course: CourseRow;
}) {
  return (
    <Link
      href={`/academic-director/courses/${course.id}`}
      className="group flex min-h-[230px] flex-col rounded-[24px] border border-slate-200 bg-slate-200/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:bg-slate-100 hover:shadow-xl hover:shadow-slate-900/5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 font-mono text-xs font-black text-sky-700">
          {course.code
            .slice(0, 3)
            .toUpperCase()}
        </div>

        <CategoryBadge
          value={course.category}
        />
      </div>

      <div className="mt-5 min-w-0">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
          {course.code}
        </p>

        <h3 className="mt-2 line-clamp-2 text-lg font-black leading-6 text-slate-950 transition-colors group-hover:text-sky-700">
          {course.title}
        </h3>

        <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
          {course.description ||
            "No description provided."}
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-4 pt-5">
        <div className="flex items-center gap-2 text-xs font-black text-slate-600">
          <Layers3 className="h-4 w-4 text-sky-700" />
          {course._count.intakes}{" "}
          {course._count.intakes === 1
            ? "intake"
            : "intakes"}
        </div>

        <div className="flex items-center gap-1 text-xs font-black text-sky-700">
          Open
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
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

          <p className="mt-1 text-[11px] font-bold text-slate-500">
            {helper}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function CategoryBadge({
  value,
}: {
  value: string;
}) {
  return (
    <span className="max-w-[150px] truncate rounded-full bg-slate-300/70 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-700">
      {formatEnum(value)}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <BookOpen className="h-8 w-8" />
      </div>

      <p className="mt-4 text-lg font-black text-slate-800">
        No courses yet
      </p>

      <Link
        href="/academic-director/courses/new"
        className="group mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Course
        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

function formatEnum(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}
