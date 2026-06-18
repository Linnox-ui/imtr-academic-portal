import type { ElementType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  LockKeyhole,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";

import {
  assignUnitToSemester,
  removeUnitFromSemester,
  submitUnitPlanForApproval,
} from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CoordinatorCourseUnitsPage({
  searchParams,
}: PageProps) {
  const params = searchParams ? await searchParams : {};
  const success = readParam(params.success);
  const error = readParam(params.error);

  const scope = await requireCoordinatorScope();

  // ============================================================================
  // GLOBAL VIEW (Super Admin / Academic Director)
  // ============================================================================
  if (scope.isGlobal) {
    const [submittedAssignments, approvedAssignments, draftAssignments] =
      await Promise.all([
        prisma.semesterUnitAssignment.count({
          where: { status: "SUBMITTED" } as any,
        }),
        prisma.semesterUnitAssignment.count({
          where: { status: "APPROVED" } as any,
        }),
        prisma.semesterUnitAssignment.count({
          where: { status: "DRAFT" } as any,
        }),
      ]);

    return (
      <div className="space-y-6">
        <PageHero
          eyebrow="Course Units"
          title="Global View"
          description="Super Administrator overview of intake unit planning status across all coordinators."
          actionHref="/coordinator/classes"
          actionLabel="View Classes"
        />
        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={Send}
            label="Submitted"
            value={submittedAssignments}
            helper="Awaiting Academic Director"
          />
          <StatCard
            icon={CheckCircle2}
            label="Approved"
            value={approvedAssignments}
            helper="Ready for lecturer allocation"
          />
          <StatCard
            icon={ClipboardCheck}
            label="Draft"
            value={draftAssignments}
            helper="Still with coordinators"
          />
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

  const [courseUnits, semesters, assignments, totalStudents] =
    await Promise.all([
      prisma.courseUnit.findMany({
        where: { courseId, isActive: true } as any,
        orderBy: [{ code: "asc" }, { title: "asc" }],
        select: { id: true, code: true, title: true, description: true },
      }),
      prisma.courseSemester.findMany({
        where: {
          isActive: true,
          courseYear: { courseId, isActive: true },
        } as any,
        orderBy: [
          { courseYear: { sequence: "asc" } },
          { sequence: "asc" },
        ] as any,
        select: {
          id: true,
          title: true,
          semesterNumber: true,
          sequence: true,
          periodType: true,
          courseYear: {
            select: { id: true, yearNumber: true, title: true, sequence: true },
          },
        },
      }),
      prisma.semesterUnitAssignment.findMany({
        where: {
          intakeId,
          semester: { courseYear: { courseId } },
          unit: { courseId },
        } as any,
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          reviewNote: true,
          rejectionReason: true,
          unit: {
            select: { id: true, code: true, title: true, description: true },
          },
          semester: {
            select: {
              id: true,
              title: true,
              sequence: true,
              courseYear: {
                select: { yearNumber: true, title: true, sequence: true },
              },
            },
          },
          submittedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
          reviewedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
          _count: { select: { lecturerAllocations: true, assessments: true } },
        },
      }),
      prisma.student.count({ where: { intakeId } as any }),
    ]);

  const assignedUnitIds = new Set(assignments.map((item) => item.unit.id));
  const draftCount = assignments.filter(
    (item) => item.status === "DRAFT",
  ).length;
  const submittedCount = assignments.filter(
    (item) => item.status === "SUBMITTED",
  ).length;
  const approvedCount = assignments.filter(
    (item) => item.status === "APPROVED",
  ).length;
  const amendmentCount = assignments.filter(
    (item) =>
      item.status === "AMENDMENT_REQUESTED" || item.status === "REJECTED",
  ).length;

  const planIsSubmitted = submittedCount > 0;
  const planIsApproved =
    assignments.length > 0 && approvedCount === assignments.length;
  const planIsLocked = planIsSubmitted || planIsApproved;
  const canEditPlan = assignments.every((item) =>
    ["DRAFT", "AMENDMENT_REQUESTED", "REJECTED"].includes(String(item.status)),
  );
  const canSubmitPlan = assignments.length > 0 && canEditPlan;

  const classLabel = intake.code;
  const description = `${intake.title} · ${intake.course.code} - ${intake.course.title}`;

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Course Unit Plan"
        title={classLabel}
        description={description}
        actionHref="/coordinator/classes"
        actionLabel="View Class"
      />

      {success ? <Notice tone="success" message={success} /> : null}
      {error ? <Notice tone="error" message={error} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Available Units"
          value={courseUnits.length}
          helper="Linked to course"
        />
        <StatCard
          icon={Layers3}
          label="Planned Units"
          value={assignments.length}
          helper="Placed in semesters"
        />
        <StatCard
          icon={Send}
          label="Submitted"
          value={submittedCount}
          helper="Awaiting approval"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved"
          value={approvedCount}
          helper="Ready for lecturers"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5 min-w-0">
          {/* SEMESTER PLAN (The "Buckets") */}
          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              icon={CalendarDays}
              title="Semester Plan"
              subtitle="Place each unit once across the assigned intake semesters."
            />

            {semesters.length ? (
              <div className="grid gap-5 p-5 sm:p-6 bg-slate-50/50">
                {semesters.map((semester) => {
                  const semesterAssignments = assignments.filter(
                    (a) => a.semester.id === semester.id,
                  );
                  return (
                    <SemesterCard
                      key={semester.id}
                      semester={semester}
                      assignments={semesterAssignments}
                      canEditPlan={canEditPlan}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No semesters found"
                text="Academic Director must create the course semesters before planning."
              />
            )}
          </section>

          {/* AVAILABLE COURSE UNITS (Where assignments are made) */}
          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
            <SectionHeader
              icon={BookOpen}
              title="Available Course Units"
              subtitle="Select a semester and click 'Add' to place an available unit into the plan."
            />

            {courseUnits.length ? (
              <div className="divide-y divide-slate-100 px-5 sm:px-6">
                {courseUnits.map((unit) => {
                  const alreadyAssigned = assignedUnitIds.has(unit.id);

                  return (
                    <div
                      key={unit.id}
                      className={`flex flex-col gap-4 py-5 lg:flex-row lg:items-center lg:justify-between transition-colors ${alreadyAssigned ? "opacity-60" : "hover:bg-slate-50/80 -mx-5 px-5 sm:-mx-6 sm:px-6"}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                            {unit.code}
                          </span>
                          {alreadyAssigned && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                              <CheckCircle2 className="inline mr-1 h-3 w-3" />
                              Placed in Plan
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-sm font-black text-slate-950">
                          {unit.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
                          {unit.description || "No description provided."}
                        </p>
                      </div>

                      {/* THE ASSIGNMENT UI */}
                      {!alreadyAssigned && canEditPlan && semesters.length ? (
                        <form
                          action={assignUnitToSemester as any}
                          className="flex flex-col gap-2 sm:flex-row sm:items-center shrink-0"
                        >
                          <input type="hidden" name="unitId" value={unit.id} />
                          <select
                            name="semesterId"
                            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 outline-none transition-all duration-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 shadow-sm"
                            defaultValue=""
                            required
                          >
                            <option value="" disabled>
                              Select Semester
                            </option>
                            {semesters.map((semester) => (
                              <option key={semester.id} value={semester.id}>
                                {getSemesterLabel(semester)}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-600 px-5 text-xs font-black text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-sky-700"
                          >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Add
                          </button>
                        </form>
                      ) : (
                        <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          {alreadyAssigned
                            ? "Already Assigned"
                            : planIsLocked
                              ? "Plan Locked"
                              : "Waiting"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No course units found"
                text="Academic Director must add active units under this course."
              />
            )}
          </section>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
              Approval Gate
            </p>
            <h2 className="mt-2 text-lg font-black tracking-tight">
              {planIsApproved
                ? "Approved Plan"
                : planIsSubmitted
                  ? "Awaiting Approval"
                  : "Draft Plan"}
            </h2>

            <div className="mt-5 space-y-3">
              <DarkInfo
                icon={GraduationCap}
                label="Course"
                value={`${intake.course.code} — ${intake.course.title}`}
              />
              <DarkInfo
                icon={CalendarDays}
                label="Intake"
                value={intake.code}
              />
              <DarkInfo
                icon={Users}
                label="Students"
                value={`${totalStudents}`}
              />
              <DarkInfo
                icon={LockKeyhole}
                label="Status"
                value={
                  planIsApproved
                    ? "Lecturer allocation open"
                    : "Lecturer allocation locked"
                }
              />
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              {canSubmitPlan ? (
                <form action={submitUnitPlanForApproval as any}>
                  <button
                    type="submit"
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-500 px-4 text-xs font-black text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-400"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Submit Plan for Approval
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs font-bold leading-5 text-slate-400 text-center">
                  {planIsApproved
                    ? "Academic Director has approved this plan. Proceed to allocate lecturers."
                    : planIsSubmitted
                      ? "The plan is with the Academic Director. Editing is locked until review."
                      : "Add at least one unit to unlock submission."}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">
                  Access Rule
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Plan belongs to one intake only.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <GuideItem
                text={`You are planning units for ${intake.code} only.`}
              />
              <GuideItem text="A unit cannot be duplicated across semesters." />
              <GuideItem text="Lecturer assignment remains locked until approval." />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Plan Status Summary
            </p>
            <div className="mt-4 grid gap-3">
              <MiniStatus label="Draft" value={draftCount} tone="slate" />
              <MiniStatus label="Submitted" value={submittedCount} tone="sky" />
              <MiniStatus
                label="Approved"
                value={approvedCount}
                tone="emerald"
              />
              <MiniStatus
                label="Needs Change"
                value={amendmentCount}
                tone="amber"
              />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function SemesterCard({
  semester,
  assignments,
  canEditPlan,
}: {
  semester: any;
  assignments: any[];
  canEditPlan: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-100 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {semester.courseYear.title ||
              `Year ${semester.courseYear.yearNumber}`}
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950">
            {semester.title}
          </h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm border border-slate-200">
          {assignments.length} unit{assignments.length === 1 ? "" : "s"} placed
        </span>
      </div>

      {assignments.length ? (
        <div className="mt-4 grid gap-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="group flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-sky-200 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-700">
                    {assignment.unit.code}
                  </span>
                  <StatusBadge status={String(assignment.status)} />
                </div>
                <p className="mt-2 text-sm font-black text-slate-950 group-hover:text-sky-700 transition-colors">
                  {assignment.unit.title}
                </p>
                {assignment.rejectionReason || assignment.reviewNote ? (
                  <p className="mt-1.5 rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold leading-5 text-amber-700 border border-amber-100">
                    Reviewer Note:{" "}
                    {assignment.rejectionReason || assignment.reviewNote}
                  </p>
                ) : null}
              </div>

              {canEditPlan &&
              ["DRAFT", "AMENDMENT_REQUESTED", "REJECTED"].includes(
                String(assignment.status),
              ) ? (
                <form
                  action={removeUnitFromSemester as any}
                  className="shrink-0"
                >
                  <input
                    type="hidden"
                    name="assignmentId"
                    value={assignment.id}
                  />
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-[10px] font-black uppercase tracking-wider text-red-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-100"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Remove
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex min-h-24 items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50/50 p-4 text-center">
          <p className="text-xs font-bold text-slate-400">
            Empty semester. Assign units from the list below.
          </p>
        </div>
      )}
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

function Notice({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${styles}`}>
      {decodeURIComponent(message)}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="m-5 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center sm:m-6">
      <Icon className="h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm font-black text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">
        {text}
      </p>
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
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
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
  tone: "emerald" | "amber" | "slate" | "sky";
}) {
  const styles = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-200 text-slate-700",
    sky: "bg-sky-100 text-sky-700",
  };
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-700">{label}</p>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-black ${styles[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    APPROVED: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    SUBMITTED: "bg-sky-100 text-sky-700 border border-sky-200",
    DRAFT: "bg-slate-100 text-slate-700 border border-slate-200",
    AMENDMENT_REQUESTED: "bg-amber-100 text-amber-700 border border-amber-200",
    REJECTED: "bg-red-100 text-red-700 border border-red-200",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${styles[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function getSemesterLabel(semester: any) {
  const yearTitle =
    semester.courseYear?.title ||
    `Year ${semester.courseYear?.yearNumber ?? "-"}`;
  return `${yearTitle} · ${semester.title}`;
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
