import type { ElementType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";
import { DownloadCsvButton } from "./download-csv-button"; // <-- Import the new button

export const dynamic = "force-dynamic";

export default async function CoordinatorStudentsPage() {
  const scope = await requireCoordinatorScope();

  const studentWhere = scope.isGlobal ? {} : { intakeId: scope.intakeId };

  const [
    students,
    totalStudents,
    activeStudents,
    suspendedStudents,
    graduatedStudents,
  ] = await Promise.all([
    prisma.student.findMany({
      where: studentWhere as any,
      orderBy: [{ createdAt: "desc" }, { firstName: "asc" }],
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        status: true,
        createdAt: true,
        intake: {
          select: {
            id: true,
            code: true,
            title: true,
            year: true,
            course: { select: { code: true, title: true } },
          },
        },
      },
    }),
    prisma.student.count({ where: studentWhere as any }),
    prisma.student.count({
      where: { ...studentWhere, status: "ACTIVE" } as any,
    }),
    prisma.student.count({
      where: { ...studentWhere, status: "SUSPENDED" } as any,
    }),
    prisma.student.count({
      where: { ...studentWhere, status: "GRADUATED" } as any,
    }),
  ]);

  const classLabel = scope.isGlobal
    ? "All intakes"
    : scope.intake?.code || "Assigned intake";
  const description = scope.isGlobal
    ? "Super Administrator global view of students across all coordinator workspaces."
    : `${scope.intake?.title} · ${scope.intake?.course.code} - ${scope.intake?.course.title}`;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Class Students
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {classLabel}
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              {description}
            </p>
          </div>

          <Link
            href="/coordinator/classes"
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            View Class Details
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Students"
          value={totalStudents}
          helper="Registered in this intake"
        />
        <StatCard
          icon={UserCheck}
          label="Active"
          value={activeStudents}
          helper="Currently active"
        />
        <StatCard
          icon={ShieldCheck}
          label="Suspended"
          value={suspendedStudents}
          helper="Temporarily blocked"
        />
        <StatCard
          icon={GraduationCap}
          label="Graduated"
          value={graduatedStudents}
          helper="Completed training"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">
                  Student List
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Showing students linked to {classLabel}.
                </p>
              </div>
            </div>

            {/* Added Download Button Here */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-sky-700">
                <Search className="h-3.5 w-3.5" /> Scoped View
              </div>
              {students.length > 0 && (
                <DownloadCsvButton students={students} filename={classLabel} />
              )}
            </div>
          </div>

          {students.length ? (
            <div className="divide-y divide-slate-100 px-5 sm:px-6">
              {students.map((student) => (
                <Link
                  key={student.id}
                  href={`/coordinator/students/${student.id}`}
                  className="group flex items-center gap-4 py-4 transition-colors hover:bg-slate-50/80 -mx-5 px-5 sm:-mx-6 sm:px-6"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sm font-black text-sky-700 shadow-sm transition-colors group-hover:bg-sky-500 group-hover:text-white">
                    {getInitials(student.firstName, student.lastName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-slate-900 transition-colors group-hover:text-sky-700">
                        {student.firstName} {student.lastName}
                      </p>
                      <StatusBadge status={student.status} />
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs font-semibold text-slate-500">
                      {student.admissionNumber}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />{" "}
                        {student.email}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />{" "}
                        {student.phone}
                      </span>
                    </div>
                  </div>

                  <div className="hidden text-right md:block">
                    <p className="text-xs font-black text-slate-700">
                      {student.intake?.code ?? "No intake"}
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">
                      Added {formatDate(student.createdAt)}
                    </p>
                  </div>

                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-sky-600 hidden sm:block" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="m-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center sm:m-6">
              <Users className="h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-black text-slate-700">
                No students found
              </p>
              <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">
                Students will appear here after they are registered under this
                intake by the Academic Director.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">
                  Access Rule
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Coordinator data is intake-based.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <GuideItem text="Only students in your assigned intake are shown." />
              <GuideItem text="Student registration is handled by Academic Director." />
              <GuideItem text="This page is read-only for coordination review." />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
              Assigned Intake
            </p>
            <h2 className="mt-2 text-lg font-black tracking-tight">
              {classLabel}
            </h2>
            <div className="mt-5 space-y-3">
              <DarkInfo
                icon={CalendarDays}
                label="Intake"
                value={
                  scope.isGlobal ? "Global view" : scope.intake?.code || "N/A"
                }
              />
              <DarkInfo
                icon={GraduationCap}
                label="Course"
                value={
                  scope.isGlobal
                    ? "All courses"
                    : `${scope.intake?.course.code} — ${scope.intake?.course.title}`
                }
              />
              <DarkInfo
                icon={Users}
                label="Students"
                value={`${totalStudents}`}
              />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Status Summary
            </p>
            <div className="mt-4 grid gap-3">
              <MiniStatus
                label="Active"
                value={activeStudents}
                tone="emerald"
              />
              <MiniStatus
                label="Suspended"
                value={suspendedStudents}
                tone="amber"
              />
              <MiniStatus
                label="Graduated"
                value={graduatedStudents}
                tone="slate"
              />
            </div>
          </section>
        </aside>
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
    <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm duration-500">
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

function DarkInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-1 break-words text-xs font-black text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function GuideItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
      <p className="text-xs font-bold leading-5 text-slate-600">{text}</p>
    </div>
  );
}

function MiniStatus({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "slate";
}) {
  const styles = {
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    slate: "bg-slate-200 text-slate-700 border-slate-300",
  };
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-black text-slate-700">{label}</p>
      <span
        className={`rounded-full border px-2.5 py-1 text-xs font-black ${styles[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    SUSPENDED: "border border-amber-200 bg-amber-50 text-amber-700",
    GRADUATED: "border border-slate-200 bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${styles[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}
