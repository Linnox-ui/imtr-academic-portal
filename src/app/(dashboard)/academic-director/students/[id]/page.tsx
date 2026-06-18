import type {
  ElementType,
  ReactNode,
} from "react";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Edit3,
  Fingerprint,
  GraduationCap,
  Hash,
  IdCard,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

import { StudentUpdateToast } from "./student-update-toast";

export const dynamic = "force-dynamic";

type StudentProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    updated?: string;
  }>;
};

export default async function StudentProfilePage({
  params,
  searchParams,
}: StudentProfilePageProps) {
  const [{ id }, { updated }] =
    await Promise.all([params, searchParams]);

  const student = await prisma.student.findUnique({
    where: {
      id,
    },
  });

  if (!student) {
    notFound();
  }

  const intake = await prisma.intake.findFirst({
    where: {
      code: student.courseCode,
    },
  });

  const course = intake
    ? await prisma.trainingCourse.findUnique({
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
      })
    : null;

  return (
    <>
      <StudentUpdateToast show={updated === "1"} />

      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Link
                href="/academic-director/students"
                aria-label="Back to students"
                className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>

              <div className="min-w-0 animate-in fade-in slide-in-from-left-3 duration-500">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
                  {student.admissionNumber}
                </p>

                <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">
                  {student.firstName} {student.lastName}
                </h1>

                <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-400">
                  {course
                    ? `${course.code} · ${course.title}`
                    : intake?.title || student.courseCode}
                </p>
              </div>
            </div>

            <Link
              href={`/academic-director/students/${student.id}/edit`}
              className="inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Student
            </Link>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Hash}
            label="Intake"
            value={intake?.code || student.courseCode}
            helper={intake ? "Linked intake" : "Stored code"}
          />

          <StatCard
            icon={CalendarDays}
            label="Year"
            value={intake ? `${intake.year}` : "Not linked"}
            helper="Admission year"
          />

          <StatCard
            icon={BookOpen}
            label="Course"
            value={course?.code || "No course"}
            helper={course?.title || "Course not linked"}
          />

          <StatCard
            icon={GraduationCap}
            label="Assessment"
            value={
              intake
                ? formatEnum(String(intake.assessmentMode))
                : "Not linked"
            }
            helper="Assessment mode"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
          <aside className="space-y-5">
            <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <Avatar
                  firstName={student.firstName}
                  lastName={student.lastName}
                />

                <h2 className="mt-4 break-words text-xl font-black text-slate-950">
                  {student.firstName} {student.lastName}
                </h2>

                <p className="mt-2 break-words rounded-2xl bg-sky-100 px-3 py-1.5 font-mono text-xs font-black text-sky-700">
                  {student.admissionNumber}
                </p>

                <div className="mt-4">
                  <StatusBadge status={student.status} />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <QuickItem
                  icon={Fingerprint}
                  label="National ID"
                  value={student.nationalId || "Not provided"}
                />

                <QuickItem
                  icon={Mail}
                  label="Email"
                  value={student.email || "Not provided"}
                />

                <QuickItem
                  icon={Phone}
                  label="Phone"
                  value={student.phone || "Not provided"}
                />
              </div>
            </section>
          </aside>

          <div className="space-y-5">
            <section className="grid gap-5 lg:grid-cols-2">
              <InfoPanel
                icon={User}
                title="Personal Information"
                subtitle="Identity and contact details"
              >
                <InfoRow
                  label="First name"
                  value={student.firstName}
                />

                <InfoRow
                  label="Last name"
                  value={student.lastName}
                />

                <InfoRow
                  label="National ID"
                  value={student.nationalId || "Not provided"}
                />

                <InfoRow
                  label="Gender"
                  value={formatEnum(String(student.gender))}
                />

                <InfoRow
                  label="Date of birth"
                  value={formatDate(student.dateOfBirth)}
                />

                <InfoRow
                  label="Email"
                  value={student.email || "Not provided"}
                />

                <InfoRow
                  label="Phone"
                  value={student.phone || "Not provided"}
                />
              </InfoPanel>

              <InfoPanel
                icon={GraduationCap}
                title="Academic Placement"
                subtitle="Admission, intake and status"
              >
                <InfoRow
                  label="Admission no."
                  value={student.admissionNumber}
                />

                <InfoRow
                  label="Status"
                  value={<StatusBadge status={student.status} />}
                />

                <InfoRow
                  label="Intake code"
                  value={intake?.code || student.courseCode}
                />

                <InfoRow
                  label="Intake title"
                  value={intake?.title || "Intake not linked"}
                />

                <InfoRow
                  label="Admission year"
                  value={intake ? `${intake.year}` : "Not linked"}
                />

                <InfoRow
                  label="Assessment"
                  value={
                    intake
                      ? formatEnum(String(intake.assessmentMode))
                      : "Not linked"
                  }
                />
              </InfoPanel>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <InfoPanel
                icon={BookOpen}
                title="Linked Course"
                subtitle="Course connected through the intake"
              >
                <InfoRow
                  label="Course title"
                  value={course?.title || "Course not found"}
                />

                <InfoRow
                  label="Course code"
                  value={course?.code || "Not available"}
                />

                <InfoRow
                  label="Category"
                  value={
                    course
                      ? formatEnum(String(course.category))
                      : "Not available"
                  }
                />

                <InfoRow
                  label="Course ID"
                  value={course?.id || "Not available"}
                />
              </InfoPanel>

              <InfoPanel
                icon={ShieldCheck}
                title="Record Information"
                subtitle="System record details"
              >
                <InfoRow
                  label="Stored code"
                  value={student.courseCode}
                />

                <InfoRow
                  label="Student ID"
                  value={student.id}
                />

                <InfoRow
                  label="Created"
                  value={formatDate(student.createdAt)}
                />

                <InfoRow
                  label="Updated"
                  value={formatDate(student.updatedAt)}
                />
              </InfoPanel>
            </section>

            <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <IdCard className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Summary
                  </p>

                  <h2 className="mt-1 text-lg font-black text-slate-950">
                    Admission Summary
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniItem
                  label="Admission"
                  value={student.admissionNumber}
                />

                <MiniItem
                  label="Intake"
                  value={intake?.code || student.courseCode}
                />

                <MiniItem
                  label="Course"
                  value={course?.code || "Not linked"}
                />

                <MiniItem
                  label="Year"
                  value={intake ? `${intake.year}` : "Not linked"}
                />
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/academic-director/students"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-black text-slate-700 transition-all hover:bg-slate-200"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Students
              </Link>

              <Link
                href={`/academic-director/students/${student.id}/edit`}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Student
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
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

          <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
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

function InfoPanel({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: ElementType;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-base font-black text-slate-950">
            {title}
          </h3>

          <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-200">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <div className="min-w-0 text-sm font-black text-slate-950 sm:text-right">
        {typeof value === "string" ? (
          <span className="block break-words">{value}</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function QuickItem({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>

        <p className="mt-0.5 break-words text-sm font-black text-slate-950">
          {value}
        </p>
      </div>
    </div>
  );
}

function MiniItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-200/50 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Avatar({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const initials =
    `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[2rem] bg-sky-100 text-2xl font-black text-sky-700 shadow-sm">
      {initials || "ST"}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
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

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
