import type { ElementType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Hash,
  Layers3,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";

import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CoordinatorClassesPage() {
  const scope = await requireCoordinatorScope();

  // ============================================================================
  // GLOBAL VIEW (Super Admin / Academic Director)
  // ============================================================================
  if (scope.isGlobal) {
    const intakes = await prisma.intake.findMany({
      take: 12,
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        code: true,
        title: true,
        year: true,
        status: true,
        course: { select: { code: true, title: true } },
      },
    });

    return (
      <div className="space-y-6">
        <PageHero
          eyebrow="Coordinator Classes"
          title="All Classes"
          description="Global oversight view for all active and historical intakes."
          actionHref="/coordinator"
          actionLabel="Back to Overview"
        />

        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">
                  Recent Intakes
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  System-wide class registry.
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 px-5 sm:px-6">
            {intakes.map((intake) => (
              <ClassRow
                key={intake.id}
                href={`/coordinator/classes/${intake.id}`}
                code={intake.code}
                title={intake.title}
                year={intake.year}
                status={String(intake.status)}
                course={`${intake.course.code} · ${intake.course.title}`}
              />
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ============================================================================
  // SCOPED VIEW (Assigned Coordinator)
  // ============================================================================
  const intakeId = scope.intakeId!;
  const courseId = scope.courseId!;
  const intake = scope.intake!;

  const [
    totalStudents,
    activeStudents,
    suspendedStudents,
    graduatedStudents,
    activeUnits,
    recentStudents,
    coordinatorAssignment,
  ] = await Promise.all([
    prisma.student.count({ where: { intakeId } as any }),
    prisma.student.count({ where: { intakeId, status: "ACTIVE" } as any }),
    prisma.student.count({ where: { intakeId, status: "SUSPENDED" } as any }),
    prisma.student.count({ where: { intakeId, status: "GRADUATED" } as any }),
    prisma.courseUnit.count({ where: { courseId, isActive: true } as any }),
    prisma.student.findMany({
      where: { intakeId } as any,
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.intakeCoordinatorAssignment.findFirst({
      where: {
        intakeId,
        coordinatorId: scope.user.id,
        isActive: true,
        endedAt: null,
      },
      select: {
        assignedAt: true,
        assignedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    }),
  ]);

  const coordinatorName = [scope.user.firstName, scope.user.lastName]
    .filter(Boolean)
    .join(" ");
  const assignedByName = coordinatorAssignment?.assignedBy
    ? [
        coordinatorAssignment.assignedBy.firstName,
        coordinatorAssignment.assignedBy.lastName,
      ]
        .filter(Boolean)
        .join(" ") || coordinatorAssignment.assignedBy.email
    : "Academic Director";

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Assigned Class"
        title={intake.code}
        description={`${intake.title} · ${intake.course.code} - ${intake.course.title}`}
        actionHref="/coordinator"
        actionLabel="Back to Overview"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          helper="Linked to this course"
        />
        <StatCard
          icon={CalendarDays}
          label="Year"
          value={intake.year}
          helper={formatStatus(String(intake.status))}
        />
        <StatCard
          icon={ShieldCheck}
          label="Access"
          value="Scoped"
          helper="This intake only"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5 min-w-0">
          {/* Class Details Matrix */}
          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              icon={GraduationCap}
              title="Class Details"
              subtitle="Main intake and course information."
            />
            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 bg-slate-50/50">
              <InfoCard icon={Hash} label="Intake Code" value={intake.code} />
              <InfoCard
                icon={CalendarDays}
                label="Admission Year"
                value={`${intake.year}`}
              />
              <InfoCard
                icon={BookOpen}
                label="Course"
                value={`${intake.course.code} — ${intake.course.title}`}
                wide
              />
              <InfoCard
                icon={ClipboardCheck}
                label="Class Status"
                value={formatStatus(String(intake.status))}
              />
              <InfoCard
                icon={Users}
                label="Coordinator"
                value={coordinatorName || scope.user.email}
              />
            </div>
          </section>

          {/* Recent Students List */}
          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              icon={Users}
              title="Recent Students"
              subtitle="Latest students registered under this intake."
            />

            {recentStudents.length ? (
              <div className="divide-y divide-slate-100 px-5 sm:px-6">
                {recentStudents.map((student) => (
                  <Link
                    key={student.id}
                    href={`/coordinator/students`}
                    className="group flex items-center gap-4 py-4 transition-colors hover:bg-slate-50/80 -mx-5 px-5 sm:-mx-6 sm:px-6"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sm font-black text-sky-700 shadow-sm group-hover:bg-sky-500 group-hover:text-white transition-colors">
                      {getInitials(student.firstName, student.lastName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950 transition-colors group-hover:text-sky-700">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs font-semibold text-slate-500">
                        {student.admissionNumber}
                      </p>
                    </div>

                    <div className="hidden text-right sm:block">
                      <StatusBadge status={student.status} />
                      <p className="mt-1 text-[10px] font-bold text-slate-400">
                        Joined {formatDate(student.createdAt)}
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-sky-600" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No students yet"
                text="Students will appear here after Academic Director registers them under this intake."
              />
            )}
          </section>
        </div>

        {/* Aside Sidebar */}
        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">
                  Coordination Scope
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Your access is limited to this intake.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <GuideItem text={`You coordinate ${intake.code} only.`} />
              <GuideItem text="Students are filtered by intake ID." />
              <GuideItem text="Other intakes remain hidden from this workspace." />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
              Appointment
            </p>
            <h2 className="mt-2 text-lg font-black tracking-tight">
              Current Coordinator
            </h2>
            <div className="mt-5 space-y-3">
              <DarkInfo
                icon={Users}
                label="Coordinator"
                value={coordinatorName || scope.user.email}
              />
              <DarkInfo icon={Mail} label="Email" value={scope.user.email} />
              <DarkInfo
                icon={ShieldCheck}
                label="Assigned By"
                value={assignedByName}
              />
              <DarkInfo
                icon={CalendarDays}
                label="Assigned On"
                value={
                  coordinatorAssignment?.assignedAt
                    ? formatDate(coordinatorAssignment.assignedAt)
                    : "Not available"
                }
              />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Student Status
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

function PageHero({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-in fade-in slide-in-from-left-3 duration-500">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
            {description}
          </p>
        </div>
        <Link
          href={actionHref}
          className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
        >
          {actionLabel}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-base font-black text-slate-950">
          {title}
        </h2>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
          {subtitle}
        </p>
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

function InfoCard({
  icon: Icon,
  label,
  value,
  wide = false,
}: {
  icon: ElementType;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-sky-200 ${wide ? "sm:col-span-2" : ""}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-black text-slate-950">
          {value}
        </p>
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
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-200 text-slate-700",
  };
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-black text-slate-700">{label}</p>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-black ${styles[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

function ClassRow({
  href,
  code,
  title,
  year,
  status,
  course,
}: {
  href: string;
  code: string;
  title: string;
  year: number;
  status: string;
  course: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 py-4 transition-colors hover:bg-slate-50 -mx-5 px-5 sm:-mx-6 sm:px-6"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 transition-colors group-hover:bg-sky-500 group-hover:text-white shadow-sm">
        <CalendarDays className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-900 transition-colors group-hover:text-sky-700">
          {code}
        </p>
        <p className="mt-1 truncate text-xs font-semibold text-slate-500">
          {course} · {title}
        </p>
      </div>
      <div className="text-right">
        <StatusBadge status={status} />
        <p className="mt-1 text-[10px] font-bold text-slate-400">{year}</p>
      </div>
      <ArrowRight className="ml-2 h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-sky-600 hidden sm:block" />
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    OPEN: "border border-sky-200 bg-sky-50 text-sky-700",
    PLANNED: "border border-violet-200 bg-violet-50 text-violet-700",
    COMPLETED: "border border-slate-200 bg-slate-100 text-slate-700",
    ARCHIVED: "border border-slate-200 bg-slate-100 text-slate-700",
    SUSPENDED: "border border-amber-200 bg-amber-50 text-amber-700",
    GRADUATED: "border border-slate-200 bg-slate-100 text-slate-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${styles[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="m-5 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center sm:m-6">
      <Users className="h-7 w-7 text-slate-400" />
      <p className="mt-3 text-sm font-black text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">
        {text}
      </p>
    </div>
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
