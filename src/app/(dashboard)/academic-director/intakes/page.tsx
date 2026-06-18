import type { ElementType } from "react";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Clock3,
  GraduationCap,
  Layers3,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type IntakeRegistryPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

async function getIntakeData() {
  const [intakes, courses] = await Promise.all([
    prisma.intake.findMany({
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.trainingCourse.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        category: true,
      },
      orderBy: {
        title: "asc",
      },
    }),
  ]);

  return {
    intakes,
    courses,
  };
}

type IntakeRow = Awaited<
  ReturnType<typeof getIntakeData>
>["intakes"][number];

type CourseRow = Awaited<
  ReturnType<typeof getIntakeData>
>["courses"][number];

export default async function IntakeRegistryPage({
  searchParams,
}: IntakeRegistryPageProps) {
  const params = await searchParams;

  const query =
    params?.q?.trim().toLowerCase() || "";
  const selectedStatus =
    params?.status?.trim() || "";

  const { intakes, courses } =
    await getIntakeData();

  const courseMap = new Map(
    courses.map((course) => [
      course.id,
      course,
    ]),
  );

  const filteredIntakes = intakes.filter(
    (intake) => {
      const course = courseMap.get(
        intake.courseId,
      );

      const matchesSearch = query
        ? [
            intake.title,
            intake.code,
            String(intake.year),
            String(intake.assessmentMode),
            course?.title,
            course?.code,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLowerCase()
                .includes(query),
            )
        : true;

      const matchesStatus = selectedStatus
        ? intake.status === selectedStatus
        : true;

      return matchesSearch && matchesStatus;
    },
  );

  const openIntakes = intakes.filter(
    (intake) => intake.status === "OPEN",
  ).length;

  const activeIntakes = intakes.filter(
    (intake) => intake.status === "ACTIVE",
  ).length;

  const plannedIntakes = intakes.filter(
    (intake) => intake.status === "PLANNED",
  ).length;

  const totalSequenceCount = intakes.reduce(
    (sum, intake) =>
      sum + intake.sequenceCounter,
    0,
  );

  const hasFilters = Boolean(
    query || selectedStatus,
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
              Intakes
            </h1>

            <p className="mt-2 text-sm font-semibold text-slate-400">
              Cohorts, admission year and assessment mode.
            </p>
          </div>

          <Link
            href="/academic-director/intakes/new"
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Intake
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers3}
          label="Intakes"
          value={intakes.length}
          helper="All cohorts"
        />

        <StatCard
          icon={BadgeCheck}
          label="Open"
          value={openIntakes}
          helper="Ready for admissions"
        />

        <StatCard
          icon={Clock3}
          label="Active"
          value={activeIntakes}
          helper="Running now"
        />

        <StatCard
          icon={Users}
          label="Sequences"
          value={totalSequenceCount}
          helper="Generated numbers"
        />
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm">
        <form
          method="GET"
          className="grid gap-3 lg:grid-cols-[1fr_220px_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search intake or course"
              className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-4 text-sm font-bold text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
            />
          </div>

          <select
            name="status"
            defaultValue={selectedStatus}
            className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
          >
            <option value="">All statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="OPEN">Open</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>

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
                href="/academic-director/intakes"
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
              Intake list
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {filteredIntakes.length}{" "}
              {filteredIntakes.length === 1
                ? "intake"
                : "intakes"}
              .
            </p>
          </div>

          <Link
            href="/academic-director/intakes/new"
            className="hidden h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 sm:inline-flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Link>
        </div>

        {filteredIntakes.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredIntakes.map((intake) => (
              <IntakeCard
                key={intake.id}
                intake={intake}
                course={courseMap.get(
                  intake.courseId,
                )}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function IntakeCard({
  intake,
  course,
}: {
  intake: IntakeRow;
  course?: CourseRow;
}) {
  return (
    <Link
      href={`/academic-director/intakes/${intake.id}`}
      className="group flex min-h-[250px] flex-col rounded-[24px] border border-slate-200 bg-slate-200/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:bg-slate-100 hover:shadow-xl hover:shadow-slate-900/5"
    >
      <div className="flex items-start justify-between gap-4">
        <IntakeAvatar code={intake.code} />
        <StatusBadge status={intake.status} />
      </div>

      <div className="mt-5 min-w-0">
        <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
          {intake.code}
        </p>

        <h3 className="mt-2 line-clamp-2 text-lg font-black leading-6 text-slate-950 transition-colors group-hover:text-sky-700">
          {intake.title}
        </h3>

        <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
          {course
            ? `${course.code} · ${course.title}`
            : "Course not found"}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniDetail
          label="Year"
          value={`${intake.year}`}
        />

        <MiniDetail
          label="Seq"
          value={`${intake.sequenceCounter}`}
        />

        <MiniDetail
          label="Mode"
          value={formatShortAssessment(
            String(intake.assessmentMode),
          )}
        />
      </div>

      <div className="mt-auto flex items-center justify-between pt-5">
        <span className="text-xs font-black text-slate-500">
          Open intake
        </span>

        <ArrowRight className="h-4 w-4 text-sky-700 transition-transform group-hover:translate-x-1" />
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

function IntakeAvatar({
  code,
}: {
  code: string;
}) {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 font-mono text-xs font-black text-sky-700">
      {code.slice(0, 3).toUpperCase()}
    </div>
  );
}

function MiniDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<string, string> = {
    PLANNED:
      "bg-sky-100 text-sky-700",
    OPEN:
      "bg-emerald-100 text-emerald-700",
    ACTIVE:
      "bg-violet-100 text-violet-700",
    COMPLETED:
      "bg-slate-300 text-slate-700",
    ARCHIVED:
      "bg-slate-300 text-slate-700",
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        styles[status] ??
        "bg-slate-300 text-slate-700"
      }`}
    >
      {formatEnum(status)}
    </span>
  );
}

function EmptyState({
  hasFilters,
}: {
  hasFilters: boolean;
}) {
  return (
    <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center">
      <CalendarDays className="h-9 w-9 text-slate-400" />

      <p className="mt-4 text-lg font-black text-slate-800">
        {hasFilters
          ? "No matching intakes"
          : "No intakes yet"}
      </p>

      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        {hasFilters
          ? "Clear the filters or search with different words."
          : "Create the first intake for an existing course."}
      </p>

      {hasFilters ? (
        <Link
          href="/academic-director/intakes"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-xs font-black text-slate-700 hover:bg-slate-200"
        >
          Clear Filters
        </Link>
      ) : (
        <Link
          href="/academic-director/intakes/new"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-xs font-black text-white hover:bg-slate-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Intake
        </Link>
      )}
    </div>
  );
}

function formatShortAssessment(value: string) {
  const map: Record<string, string> = {
    CAT_AND_FINAL_EXAM: "CAT+Exam",
    CAT_ONLY: "CAT",
    NO_EXAM: "No Exam",
    PRACTICAL_ONLY: "Practical",
    ATTENDANCE_BASED: "Attendance",
    COMPETENCY_BASED: "Competency",
  };

  return map[value] || formatEnum(value);
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}
