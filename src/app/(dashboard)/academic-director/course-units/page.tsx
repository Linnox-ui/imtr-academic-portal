import type { ElementType } from "react";
import type { Prisma } from "@prisma/client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Filter,
  GraduationCap,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  ToggleLeft,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

import { CourseUnitStatusControl } from "./course-unit-status-control";

export const dynamic = "force-dynamic";

type CourseUnitsPageProps = {
  searchParams: Promise<{
    q?: string;
    course?: string;
  }>;
};

type UnitWithCourse =
  Prisma.CourseUnitGetPayload<{
    include: {
      course: {
        select: {
          id: true;
          code: true;
          title: true;
          category: true;
        };
      };
    };
  }>;

export default async function CourseUnitsPage({
  searchParams,
}: CourseUnitsPageProps) {
  const params = await searchParams;

  const query = params.q?.trim() || "";
  const selectedCourseId =
    params.course?.trim() || "";

  const where: Prisma.CourseUnitWhereInput = {
    AND: [
      query
        ? {
            OR: [
              {
                code: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                title: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                course: {
                  is: {
                    code: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                course: {
                  is: {
                    title: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {},
      selectedCourseId
        ? {
            courseId: selectedCourseId,
          }
        : {},
    ],
  };

  const [
    units,
    courses,
    totalUnits,
    activeUnits,
    inactiveUnits,
    coursesWithUnits,
  ] = await Promise.all([
    prisma.courseUnit.findMany({
      where,
      orderBy: [
        {
          course: {
            title: "asc",
          },
        },
        {
          code: "asc",
        },
      ],
      include: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
            category: true,
          },
        },
      },
    }),

    prisma.trainingCourse.findMany({
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        code: true,
        title: true,
      },
    }),

    prisma.courseUnit.count(),

    prisma.courseUnit.count({
      where: {
        isActive: true,
      },
    }),

    prisma.courseUnit.count({
      where: {
        isActive: false,
      },
    }),

    prisma.trainingCourse.count({
      where: {
        units: {
          some: {},
        },
      },
    }),
  ]);

  const hasFilters = Boolean(
    query || selectedCourseId,
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Academic Director
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Course Units
            </h1>

            <p className="mt-2 text-sm font-semibold text-slate-400">
              Subjects linked to IMTR courses.
            </p>
          </div>

          <Link
            href="/academic-director/course-units/new"
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers3}
          label="Units"
          value={totalUnits}
          helper="All course units"
        />

        <StatCard
          icon={ShieldCheck}
          label="Active"
          value={activeUnits}
          helper="Available units"
        />

        <StatCard
          icon={ToggleLeft}
          label="Inactive"
          value={inactiveUnits}
          helper="Disabled units"
        />

        <StatCard
          icon={BookOpen}
          label="Courses"
          value={coursesWithUnits}
          helper="With units"
        />
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm">
        <form
          method="GET"
          className="grid gap-3 lg:grid-cols-[1fr_300px_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search units or courses"
              className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-4 text-sm font-bold text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
            />
          </div>

          <div className="relative">
            <Filter className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

            <select
              name="course"
              defaultValue={selectedCourseId}
              className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
            >
              <option value="">
                All courses
              </option>

              {courses.map((course) => (
                <option
                  key={course.id}
                  value={course.id}
                >
                  {course.code} — {course.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <Search className="mr-2 h-4 w-4" />
              Search
            </button>

            {hasFilters ? (
              <Link
                href="/academic-director/course-units"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-black text-slate-700 transition-all hover:bg-slate-200"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Registry
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-950">
              Unit list
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {units.length}{" "}
              {units.length === 1 ? "unit" : "units"}.
            </p>
          </div>

          <Link
            href="/academic-director/course-units/new"
            className="hidden h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 sm:inline-flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Link>
        </div>

        {units.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {units.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function UnitCard({
  unit,
}: {
  unit: UnitWithCourse;
}) {
  return (
    <article className="group flex min-h-[250px] flex-col rounded-[24px] border border-slate-200 bg-slate-200/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:bg-slate-100 hover:shadow-xl hover:shadow-slate-900/5">
      <div className="flex items-start justify-between gap-4">
        <UnitAvatar code={unit.code} />

        <CourseUnitStatusControl
          unitId={unit.id}
          unitCode={unit.code}
          unitTitle={unit.title}
          isActive={unit.isActive}
        />
      </div>

      <div className="mt-5 min-w-0">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
          {unit.code}
        </p>

        <h3 className="mt-2 line-clamp-2 text-lg font-black leading-6 text-slate-950 transition-colors group-hover:text-sky-700">
          {unit.title}
        </h3>

        <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
          {unit.description ||
            "No description provided."}
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          Course
        </p>

        <p className="mt-1 line-clamp-1 text-sm font-black text-slate-900">
          {unit.course.code} — {unit.course.title}
        </p>

        <p className="mt-1 text-xs font-semibold text-slate-500">
          {formatEnum(String(unit.course.category))}
        </p>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <Link
          href={`/academic-director/course-units/${unit.id}`}
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-3 text-xs font-black text-white transition-all hover:bg-slate-800"
        >
          View
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>

        <Link
          href={`/academic-director/courses/${unit.course.id}`}
          className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-3 text-xs font-black text-slate-700 transition-all hover:bg-slate-200"
        >
          Course
          <GraduationCap className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </article>
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

function UnitAvatar({
  code,
}: {
  code: string;
}) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 px-2 text-center font-mono text-[10px] font-black text-sky-700">
      {code.slice(0, 5).toUpperCase()}
    </div>
  );
}

function EmptyState({
  hasFilters,
}: {
  hasFilters: boolean;
}) {
  return (
    <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center">
      <Layers3 className="h-9 w-9 text-slate-400" />

      <p className="mt-4 text-lg font-black text-slate-800">
        {hasFilters
          ? "No matching units"
          : "No course units yet"}
      </p>

      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        {hasFilters
          ? "Clear the filters or search with different words."
          : "Add the first unit and link it to a course."}
      </p>

      {hasFilters ? (
        <Link
          href="/academic-director/course-units"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-xs font-black text-slate-700 hover:bg-slate-200"
        >
          Clear Filters
        </Link>
      ) : (
        <Link
          href="/academic-director/course-units/new"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-xs font-black text-white hover:bg-slate-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Unit
        </Link>
      )}
    </div>
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
