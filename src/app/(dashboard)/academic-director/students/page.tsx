import type { ElementType, ReactNode } from "react";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Fingerprint,
  GraduationCap,
  Plus,
  Search,
  UserCheck,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

import { StudentActionsMenu } from "./student-actions-menu";

export const dynamic = "force-dynamic";

type StudentRegistryPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
  }>;
};

async function getStudentRegistryData() {
  const [students, intakes, courses] = await Promise.all([
    prisma.student.findMany({
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.intake.findMany({
      orderBy: {
        createdAt: "desc",
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
        category: true,
      },
    }),
  ]);

  return {
    students,
    intakes,
    courses,
  };
}

type StudentRow = Awaited<
  ReturnType<typeof getStudentRegistryData>
>["students"][number];

type IntakeRow = Awaited<
  ReturnType<typeof getStudentRegistryData>
>["intakes"][number];

type CourseRow = Awaited<
  ReturnType<typeof getStudentRegistryData>
>["courses"][number];

type StudentWithPlacement = StudentRow & {
  intake?: IntakeRow;
  course?: CourseRow;
};

export default async function StudentRegistryPage({
  searchParams,
}: StudentRegistryPageProps) {
  const params = await searchParams;

  const query = params?.q?.trim().toLowerCase() || "";
  const selectedStatus = params?.status?.trim() || "";

  const { students, intakes, courses } = await getStudentRegistryData();

  const intakeMap = new Map(intakes.map((intake) => [intake.code, intake]));
  const courseMap = new Map(courses.map((course) => [course.id, course]));

  const studentsWithPlacement: StudentWithPlacement[] = students.map((student) => {
    const intake = intakeMap.get(student.courseCode);
    const course = intake ? courseMap.get(intake.courseId) : undefined;

    return {
      ...student,
      intake,
      course,
    };
  });

  const filteredStudents = studentsWithPlacement.filter((student) => {
    const matchesSearch = query
      ? [
          student.firstName,
          student.lastName,
          student.admissionNumber,
          student.nationalId,
          student.email,
          student.phone,
          student.courseCode,
          student.intake?.title,
          student.intake?.code,
          student.course?.title,
          student.course?.code,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      : true;

    const matchesStatus = selectedStatus
      ? student.status === selectedStatus
      : true;

    return matchesSearch && matchesStatus;
  });

  const activeStudents = students.filter((student) => student.status === "ACTIVE").length;
  const suspendedStudents = students.filter((student) => student.status === "SUSPENDED").length;
  const linkedStudents = studentsWithPlacement.filter((student) => student.intake).length;
  const hasFilters = Boolean(query || selectedStatus);

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
              Students
            </h1>

            <p className="mt-2 text-sm font-semibold text-slate-400">
              Student records, intakes and academic placement.
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
        <StatCard icon={Users} label="Students" value={students.length} helper="All registered" />
        <StatCard icon={UserCheck} label="Active" value={activeStudents} helper="Current students" />
        <StatCard icon={GraduationCap} label="Linked" value={linkedStudents} helper="Matched to intakes" />
        <StatCard icon={BadgeCheck} label="Suspended" value={suspendedStudents} helper="Temporarily inactive" />
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm">
        <form method="GET" className="grid gap-3 lg:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search name, admission number, ID or course"
              className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-4 text-sm font-bold text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
            />
          </div>

          <select
            name="status"
            defaultValue={selectedStatus}
            className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
            <option value="GRADUATED">Graduated</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="DEFERRED">Deferred</option>
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
                href="/academic-director/students"
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
              Student list
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Showing {filteredStudents.length}{" "}
              {filteredStudents.length === 1 ? "student" : "students"}.
            </p>
          </div>

          <Link
            href="/academic-director/students/new"
            className="hidden h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 sm:inline-flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Link>
        </div>

        {filteredStudents.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredStudents.map((student) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StudentCard({ student }: { student: StudentWithPlacement }) {
  return (
    <article className="group flex min-h-[285px] flex-col rounded-[24px] border border-slate-200 bg-slate-200/50 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:bg-slate-100 hover:shadow-xl hover:shadow-slate-900/5">
      <div className="flex items-start justify-between gap-4">
        <Avatar student={student} />

        <StudentActionsMenu
          studentId={student.id}
          studentName={`${student.firstName} ${student.lastName}`}
          studentStatus={student.status}
        />
      </div>

      <div className="mt-5 min-w-0">
        <p className="text-lg font-black leading-6 text-slate-950 transition-colors group-hover:text-sky-700">
          {student.firstName} {student.lastName}
        </p>

        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-slate-500">
          <Fingerprint className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {student.nationalId || "No national ID"}
          </span>
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          Admission Number
        </p>

        <p className="mt-1 break-words text-sm font-black text-slate-900">
          {student.admissionNumber}
        </p>
      </div>

      <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
        <InfoLine
          label="Intake"
          value={
            student.intake
              ? `${student.intake.code} · ${student.intake.title}`
              : student.courseCode
          }
        />

        <InfoLine
          label="Course"
          value={
            student.course
              ? `${student.course.code} · ${student.course.title}`
              : "Course not found"
          }
        />

        <InfoLine label="Status" value={<StatusBadge status={student.status} />} />
      </div>

      <div className="mt-auto pt-4">
        <Link
          href={`/academic-director/students/${student.id}`}
          className="inline-flex h-10 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:bg-slate-800"
        >
          View Student
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

function Avatar({
  student,
}: {
  student: Pick<StudentRow, "firstName" | "lastName">;
}) {
  const initials = `${student.firstName?.[0] || ""}${
    student.lastName?.[0] || ""
  }`.toUpperCase();

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sm font-black text-sky-700">
      {initials || "ST"}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    SUSPENDED: "bg-amber-100 text-amber-700",
    INACTIVE: "bg-slate-300 text-slate-700",
    GRADUATED: "bg-sky-100 text-sky-700",
    WITHDRAWN: "bg-rose-100 text-rose-700",
    DEFERRED: "bg-violet-100 text-violet-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        styles[status] || "bg-slate-300 text-slate-700"
      }`}
    >
      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" />
      {formatEnum(status)}
    </span>
  );
}

function InfoLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <div className="min-w-0 text-right text-xs font-black text-slate-900">
        {typeof value === "string" ? (
          <span className="block break-words">{value}</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center">
      <Users className="h-9 w-9 text-slate-400" />

      <p className="mt-4 text-lg font-black text-slate-800">
        {hasFilters ? "No matching students" : "No students yet"}
      </p>

      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        {hasFilters
          ? "Clear the filters or search with different words."
          : "Register the first student and assign them to an intake."}
      </p>

      {hasFilters ? (
        <Link
          href="/academic-director/students"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-xs font-black text-slate-700 hover:bg-slate-200"
        >
          Clear Filters
        </Link>
      ) : (
        <Link
          href="/academic-director/students/new"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-xs font-black text-white hover:bg-slate-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Link>
      )}
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
