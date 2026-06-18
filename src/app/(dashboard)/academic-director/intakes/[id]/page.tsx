import type { ElementType } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Edit3,
  FileText,
  Fingerprint,
  GraduationCap,
  Layers3,
  Mail,
  UserCheck,
  Users,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type IntakeProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function IntakeProfilePage({
  params,
}: IntakeProfilePageProps) {
  const { id } = await params;

  const intake = await prisma.intake.findUnique({
    where: {
      id,
    },
  });

  if (!intake) {
    notFound();
  }

  const [course, students] =
    await Promise.all([
      prisma.trainingCourse.findUnique({
        where: {
          id: intake.courseId,
        },
        select: {
          id: true,
          code: true,
          title: true,
          category: true,
          description: true,
        },
      }),

      prisma.student.findMany({
        where: {
          courseCode: intake.code,
        },
        orderBy: [
          {
            status: "asc",
          },
          {
            firstName: "asc",
          },
          {
            lastName: "asc",
          },
        ],
      }),
    ]);

  const activeStudents = students.filter(
    (student) => student.status === "ACTIVE",
  ).length;

  const suspendedStudents =
    students.filter(
      (student) =>
        student.status === "SUSPENDED",
    ).length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href="/academic-director/intakes"
              aria-label="Back to intakes"
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0 animate-in fade-in slide-in-from-left-3 duration-500">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
                {intake.code}
              </p>

              <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">
                {intake.title}
              </h1>

              <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-400">
                {course
                  ? `${course.code} · ${course.title}`
                  : "Course not found"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/academic-director/intakes/${intake.id}/structure`}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] px-4 text-xs font-black text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <FileText className="mr-2 h-4 w-4" />
              Structure
            </Link>

            <Link
              href={`/academic-director/intakes/${intake.id}/edit`}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers3}
          label="Intake"
          value={intake.code}
          helper="Official code"
        />

        <StatCard
          icon={Users}
          label="Students"
          value={`${students.length}`}
          helper="Enrolled cohort"
        />

        <StatCard
          icon={UserCheck}
          label="Active"
          value={`${activeStudents}`}
          helper="Current students"
        />

        <StatCard
          icon={CalendarDays}
          label="Year"
          value={`${intake.year}`}
          helper="Admission year"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <SectionTitle
              icon={Layers3}
              eyebrow="Intake"
              title="Details"
            />

            <div className="mt-5 space-y-3">
              <InfoRow
                label="Title"
                value={intake.title}
              />

              <InfoRow
                label="Status"
                value={formatEnum(intake.status)}
              />

              <InfoRow
                label="Assessment"
                value={formatEnum(
                  String(intake.assessmentMode),
                )}
              />

              <InfoRow
                label="Sequence"
                value={`${intake.sequenceCounter}`}
              />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <SectionTitle
              icon={BookOpen}
              eyebrow="Course"
              title="Linked course"
            />

            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-200/50 p-5">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
                {course?.code || intake.courseId}
              </p>

              <h3 className="mt-2 break-words text-lg font-black leading-6 text-slate-950">
                {course?.title || "Course not found"}
              </h3>

              <p className="mt-2 text-xs font-bold text-slate-500">
                {course
                  ? formatEnum(String(course.category))
                  : "Not available"}
              </p>

              <p className="mt-4 line-clamp-3 text-xs font-semibold leading-5 text-slate-500">
                {course?.description ||
                  "No course description provided."}
              </p>

              {course ? (
                <Link
                  href={`/academic-director/courses/${course.id}`}
                  className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  View Course
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </section>
        </div>

        <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <SectionTitle
              icon={Users}
              eyebrow="Cohort"
              title="Students"
            />

            <Link
              href="/academic-director/students/new"
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Enroll
            </Link>
          </div>

          {students.length === 0 ? (
            <EmptyCohort
              intakeCode={intake.code}
            />
          ) : (
            <div className="mt-5 grid gap-3">
              {students.slice(0, 10).map((student) => (
                <StudentRow
                  key={student.id}
                  student={student}
                />
              ))}

              {students.length > 10 ? (
                <p className="pt-2 text-center text-xs font-bold text-slate-500">
                  Showing 10 of {students.length} students.
                </p>
              ) : null}
            </div>
          )}
        </section>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SmallSummary
          label="Total"
          value={`${students.length}`}
        />

        <SmallSummary
          label="Active"
          value={`${activeStudents}`}
        />

        <SmallSummary
          label="Suspended"
          value={`${suspendedStudents}`}
        />
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/academic-director/intakes"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-black text-slate-700 transition-all hover:bg-slate-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Intakes
        </Link>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={`/academic-director/intakes/${intake.id}/structure`}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-6 text-sm font-black text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-200"
          >
            <FileText className="mr-2 h-4 w-4" />
            Structure
          </Link>

          <Link
            href={`/academic-director/intakes/${intake.id}/edit`}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Intake
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: ElementType;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-lg font-black text-slate-950">
          {title}
        </h2>
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-200/50 p-4">
      <p className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="min-w-0 break-words text-right text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function StudentRow({
  student,
}: {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    nationalId: string;
    email: string;
    status: string;
  };
}) {
  return (
    <Link
      href={`/academic-director/students/${student.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-4 transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:bg-slate-100 hover:shadow-md"
    >
      <StudentAvatar
        firstName={student.firstName}
        lastName={student.lastName}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950 transition-colors group-hover:text-sky-700">
          {student.firstName} {student.lastName}
        </p>

        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
          <Fingerprint className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {student.admissionNumber}
          </span>
        </p>

        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {student.email || "No email"}
          </span>
        </p>
      </div>

      <StudentStatusBadge
        status={student.status}
      />

      <ArrowUpRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

function StudentAvatar({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`;

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sm font-black text-sky-700">
      {initials.toUpperCase()}
    </div>
  );
}

function StudentStatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        status === "ACTIVE"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-300 text-slate-700"
      }`}
    >
      {formatEnum(status)}
    </span>
  );
}

function EmptyCohort({
  intakeCode,
}: {
  intakeCode: string;
}) {
  return (
    <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center">
      <Users className="h-8 w-8 text-slate-400" />

      <p className="mt-3 text-sm font-black text-slate-700">
        No students enrolled
      </p>

      <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">
        Add students using intake code {intakeCode}.
      </p>
    </div>
  );
}

function SmallSummary({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-950">
        {value}
      </p>
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
