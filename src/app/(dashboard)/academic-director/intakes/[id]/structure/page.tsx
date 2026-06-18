import type { ElementType } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Layers3,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

import {
  approveCoordinatorUnitPlan,
  createAcademicSemester,
  createAcademicYear,
  deactivateAcademicSemester,
  deactivateAcademicYear,
  generateStandardAcademicStructure,
  requestCoordinatorUnitPlanAmendment,
} from "./actions";

export const dynamic = "force-dynamic";

type StructurePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AcademicStructurePage({
  params,
  searchParams,
}: StructurePageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const success = readParam(query.success);
  const error = readParam(query.error);

  const intake = await prisma.intake.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      code: true,
      title: true,
      year: true,
      status: true,
      assessmentMode: true,
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          category: true,
          courseYears: {
            orderBy: [
              {
                sequence: "asc",
              },
              {
                yearNumber: "asc",
              },
            ],
            select: {
              id: true,
              yearNumber: true,
              title: true,
              sequence: true,
              isActive: true,
              semesters: {
                orderBy: [
                  {
                    sequence: "asc",
                  },
                  {
                    title: "asc",
                  },
                ],
                select: {
                  id: true,
                  title: true,
                  semesterNumber: true,
                  sequence: true,
                  periodType: true,
                  isActive: true,
                },
              },
            },
          },
          units: {
            where: {
              isActive: true,
            },
            orderBy: [
              {
                code: "asc",
              },
              {
                title: "asc",
              },
            ],
            select: {
              id: true,
              code: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!intake) {
    notFound();
  }

  const [unitAssignments, coordinatorAssignment] = await Promise.all([
    prisma.semesterUnitAssignment.findMany({
      where: {
        intakeId: intake.id,
      } as any,
      orderBy: [
        { semester: { courseYear: { sequence: "asc" } } },
        { semester: { sequence: "asc" } },
        { unit: { code: "asc" } },
      ] as any,
      select: {
        id: true,
        status: true,
        semesterId: true,
        submittedAt: true,
        reviewedAt: true,
        reviewNote: true,
        rejectionReason: true,
        unit: {
          select: {
            code: true,
            title: true,
          },
        },
        semester: {
          select: {
            title: true,
            sequence: true,
            courseYear: {
              select: {
                yearNumber: true,
                title: true,
                sequence: true,
              },
            },
          },
        },
        submittedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),

    prisma.intakeCoordinatorAssignment.findFirst({
      where: {
        intakeId: intake.id,
        isActive: true,
        endedAt: null,
      },
      select: {
        coordinator: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const activeYears = intake.course.courseYears.filter((year) => year.isActive);
  const activeSemesters = activeYears.flatMap((year) =>
    year.semesters.filter((semester) => semester.isActive),
  );

  const assignmentsBySemester = new Map<string, number>();

  for (const assignment of unitAssignments) {
    assignmentsBySemester.set(
      assignment.semesterId,
      (assignmentsBySemester.get(assignment.semesterId) || 0) + 1,
    );
  }

  const draftCount = unitAssignments.filter(
    (assignment) => assignment.status === "DRAFT",
  ).length;
  const submittedCount = unitAssignments.filter(
    (assignment) => assignment.status === "SUBMITTED",
  ).length;
  const approvedCount = unitAssignments.filter(
    (assignment) => assignment.status === "APPROVED",
  ).length;
  const amendmentCount = unitAssignments.filter(
    (assignment) =>
      assignment.status === "AMENDMENT_REQUESTED" ||
      assignment.status === "REJECTED",
  ).length;
  const pendingReviewAssignments = unitAssignments.filter(
    (assignment) => assignment.status === "SUBMITTED",
  );
  const planIsApproved =
    unitAssignments.length > 0 && approvedCount === unitAssignments.length;
  const hasStructure = activeYears.length > 0 && activeSemesters.length > 0;

  const coordinatorName = coordinatorAssignment?.coordinator
    ? [
        coordinatorAssignment.coordinator.firstName,
        coordinatorAssignment.coordinator.lastName,
      ]
        .filter(Boolean)
        .join(" ") || coordinatorAssignment.coordinator.email
    : "Not assigned";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href={`/academic-director/intakes/${intake.id}`}
              aria-label="Back to intake"
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0 animate-in fade-in slide-in-from-left-3 duration-500">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
                {intake.code}
              </p>

              <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">
                Academic Structure
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
                Create years and semesters before the coordinator plans units.
              </p>
            </div>
          </div>

          <a
            href="#coordinator-unit-plan"
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            Review Plan
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </section>

      {success ? <Notice tone="success" message={success} /> : null}
      {error ? <Notice tone="error" message={error} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label="Years"
          value={activeYears.length}
          helper="Active academic years"
        />

        <StatCard
          icon={CalendarDays}
          label="Semesters"
          value={activeSemesters.length}
          helper="Available to coordinator"
        />

        <StatCard
          icon={BookOpen}
          label="Units"
          value={intake.course.units.length}
          helper="Linked to this course"
        />

        <StatCard
          icon={CheckCircle2}
          label="Approved"
          value={approvedCount}
          helper={`${submittedCount} pending review`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section
            id="current-structure"
            className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm"
          >
            <SectionHeader
              icon={Layers3}
              title="Current Structure"
              subtitle="This structure comes from the intake’s linked course."
            />

            {hasStructure ? (
              <div className="grid gap-4 p-5 sm:p-6">
                {activeYears.map((year) => (
                  <YearCard
                    key={year.id}
                    intakeId={intake.id}
                    year={year}
                    assignmentsBySemester={assignmentsBySemester}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No academic structure"
                text="Generate the standard structure or add years and semesters manually."
              />
            )}
          </section>

          <ReviewPlanSection
            intakeId={intake.id}
            assignments={unitAssignments}
            pendingAssignments={pendingReviewAssignments}
            draftCount={draftCount}
            submittedCount={submittedCount}
            approvedCount={approvedCount}
            amendmentCount={amendmentCount}
            planIsApproved={planIsApproved}
          />

          <section className="grid gap-5 xl:grid-cols-2">
            <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
              <SectionHeader
                icon={Plus}
                title="Add Academic Year"
                subtitle="Use only when the course needs an extra year."
              />

              <form
                action={createAcademicYear}
                className="grid gap-4 p-5 sm:p-6"
              >
                <input type="hidden" name="intakeId" value={intake.id} />

                <InputField
                  label="Year title"
                  name="title"
                  placeholder="Year 1"
                  required
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField
                    label="Year number"
                    name="yearNumber"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                  />

                  <InputField
                    label="Sequence"
                    name="sequence"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                  />
                </div>

                <ActionButton icon={Plus} label="Add Year" />
              </form>
            </section>

            <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
              <SectionHeader
                icon={CalendarDays}
                title="Add Semester"
                subtitle="Add semester under an existing year."
              />

              <form
                action={createAcademicSemester}
                className="grid gap-4 p-5 sm:p-6"
              >
                <input type="hidden" name="intakeId" value={intake.id} />

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700">
                    Academic year
                  </label>

                  <select
                    required
                    name="courseYearId"
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select year
                    </option>
                    {activeYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.title}
                      </option>
                    ))}
                  </select>
                </div>

                <InputField
                  label="Semester title"
                  name="title"
                  placeholder="Semester 1"
                  required
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField
                    label="Semester number"
                    name="semesterNumber"
                    type="number"
                    min="1"
                    defaultValue="1"
                  />

                  <InputField
                    label="Sequence"
                    name="sequence"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700">
                    Period type
                  </label>

                  <select
                    name="periodType"
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
                    defaultValue="SEMESTER"
                  >
                    <option value="SEMESTER">Semester</option>
                    <option value="TRAINING_BLOCK">Training Block</option>
                  </select>
                </div>

                <ActionButton
                  icon={Plus}
                  label="Add Semester"
                  disabled={activeYears.length === 0}
                />
              </form>
            </section>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">
                  Correct Flow
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Structure first, unit plan second.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <GuideItem text="Academic Director creates the year and semester structure." />
              <GuideItem text="Coordinator places units into those semesters." />
              <GuideItem text="Academic Director approves before lecturer allocation." />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
              Standard Setup
            </p>

            <h2 className="mt-2 text-lg font-black tracking-tight">
              Generate Quickly
            </h2>

            <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
              For diploma courses like MMTC, generate Year 1 and Year 2 with two
              semesters each.
            </p>

            <form
              action={generateStandardAcademicStructure}
              className="mt-5 space-y-3"
            >
              <input type="hidden" name="intakeId" value={intake.id} />

              <div className="grid grid-cols-2 gap-3">
                <DarkInput label="Years" name="yearsCount" defaultValue="2" />

                <DarkInput
                  label="Sem / Year"
                  name="semestersPerYear"
                  defaultValue="2"
                />
              </div>

              <button
                type="submit"
                className="group inline-flex h-11 w-full items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Generate Structure
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Intake Summary
            </p>

            <div className="mt-4 space-y-3">
              <InfoTile
                icon={Layers3}
                label="Intake"
                value={`${intake.code} · ${intake.year}`}
              />

              <InfoTile
                icon={BookOpen}
                label="Course"
                value={`${intake.course.code} — ${intake.course.title}`}
              />

              <InfoTile
                icon={Users}
                label="Coordinator"
                value={coordinatorName}
              />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function ReviewPlanSection({
  intakeId,
  assignments,
  pendingAssignments,
  draftCount,
  submittedCount,
  approvedCount,
  amendmentCount,
  planIsApproved,
}: {
  intakeId: string;
  assignments: any[];
  pendingAssignments: any[];
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  amendmentCount: number;
  planIsApproved: boolean;
}) {
  const hasAssignments = assignments.length > 0;
  const hasPendingReview = pendingAssignments.length > 0;

  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
      <SectionHeader
        icon={ClipboardCheck}
        title="Coordinator Unit Plan"
        subtitle="Review submitted semester-unit structure before lecturer allocation."
      />

      {!hasAssignments ? (
        <EmptyState
          title="No coordinator plan yet"
          text="After the coordinator places units into semesters and submits the plan, it will appear here for review."
        />
      ) : (
        <div className="space-y-5 p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-4">
            <ReviewMetric label="Draft" value={draftCount} />
            <ReviewMetric label="Submitted" value={submittedCount} />
            <ReviewMetric label="Approved" value={approvedCount} />
            <ReviewMetric label="Needs Change" value={amendmentCount} />
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-200/50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Review Status
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-950">
                  {hasPendingReview
                    ? "Pending Academic Director Review"
                    : planIsApproved
                      ? "Approved Unit Plan"
                      : amendmentCount > 0
                        ? "Returned for Amendment"
                        : "Still in Draft"}
                </h3>

                <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
                  {hasPendingReview
                    ? "Approve the submitted structure or return it with a clear note for correction."
                    : planIsApproved
                      ? "This plan is approved. Lecturer allocation and timetable work can be opened next."
                      : amendmentCount > 0
                        ? "The coordinator must revise and resubmit this plan before approval."
                        : "The coordinator has not submitted the plan for review yet."}
                </p>
              </div>

              <StatusBadge
                status={
                  hasPendingReview
                    ? "SUBMITTED"
                    : planIsApproved
                      ? "APPROVED"
                      : amendmentCount > 0
                        ? "AMENDMENT_REQUESTED"
                        : "DRAFT"
                }
              />
            </div>
          </div>

          {assignments.length ? (
            <div className="grid gap-3">
              {assignments.map((assignment) => (
                <PlanReviewRow key={assignment.id} assignment={assignment} />
              ))}
            </div>
          ) : null}

          {hasPendingReview ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <form
                action={approveCoordinatorUnitPlan}
                className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4"
              >
                <input type="hidden" name="intakeId" value={intakeId} />

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-emerald-900">
                      Approve Plan
                    </h4>
                    <p className="mt-1 text-xs font-semibold leading-5 text-emerald-800">
                      This unlocks the next stage for lecturer allocation and
                      timetable preparation.
                    </p>
                  </div>
                </div>

                <textarea
                  name="reviewNote"
                  placeholder="Optional approval note"
                  className="mt-4 min-h-24 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />

                <button
                  type="submit"
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-emerald-700 px-4 text-xs font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-800"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve Unit Plan
                </button>
              </form>

              <form
                action={requestCoordinatorUnitPlanAmendment}
                className="rounded-[24px] border border-amber-200 bg-amber-50 p-4"
              >
                <input type="hidden" name="intakeId" value={intakeId} />

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <XCircle className="h-5 w-5" />
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-amber-900">
                      Return for Amendment
                    </h4>
                    <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                      Send the plan back to the coordinator with a correction
                      note.
                    </p>
                  </div>
                </div>

                <textarea
                  required
                  name="reviewNote"
                  placeholder="Example: Move Climatology to Year 1 Semester 2 before approval."
                  className="mt-4 min-h-24 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                />

                <button
                  type="submit"
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-amber-600 px-4 text-xs font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-700"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Return Plan
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-200/50 p-4 text-xs font-bold leading-5 text-slate-600">
              {planIsApproved
                ? "Approval is complete. Do not change the academic structure unless officially required."
                : amendmentCount > 0
                  ? "Waiting for the coordinator to revise and resubmit the plan."
                  : "Waiting for the coordinator to submit the plan for approval."}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PlanReviewRow({ assignment }: { assignment: any }) {
  const submittedBy = assignment.submittedBy
    ? getPersonName(assignment.submittedBy)
    : "Not submitted";

  const reviewedBy = assignment.reviewedBy
    ? getPersonName(assignment.reviewedBy)
    : "Not reviewed";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-sky-700">
              {assignment.unit.code}
            </span>
            <StatusBadge status={String(assignment.status)} />
          </div>

          <h4 className="mt-2 text-sm font-black text-slate-950">
            {assignment.unit.title}
          </h4>

          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {assignment.semester.courseYear.title} · {assignment.semester.title}
          </p>

          {assignment.reviewNote || assignment.rejectionReason ? (
            <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
              {assignment.rejectionReason || assignment.reviewNote}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 text-left sm:min-w-44 sm:text-right">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Submitted
          </p>
          <p className="text-xs font-black text-slate-700">{submittedBy}</p>
          {assignment.submittedAt ? (
            <p className="text-[10px] font-bold text-slate-400">
              {formatDate(assignment.submittedAt)}
            </p>
          ) : null}

          {assignment.reviewedAt ? (
            <>
              <p className="pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Reviewed
              </p>
              <p className="text-xs font-black text-slate-700">{reviewedBy}</p>
              <p className="text-[10px] font-bold text-slate-400">
                {formatDate(assignment.reviewedAt)}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-200 text-slate-700",
    SUBMITTED: "bg-sky-100 text-sky-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
    AMENDMENT_REQUESTED: "bg-amber-100 text-amber-700",
    REJECTED: "bg-red-100 text-red-700",
    ARCHIVED: "bg-slate-300 text-slate-700",
  };

  return (
    <span
      className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        styles[status] ?? "bg-slate-200 text-slate-700"
      }`}
    >
      {formatEnum(status)}
    </span>
  );
}

function getPersonName(person: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}) {
  const name = [person.firstName, person.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || person.email || "Unknown";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function YearCard({
  intakeId,
  year,
  assignmentsBySemester,
}: {
  intakeId: string;
  year: {
    id: string;
    yearNumber: number;
    title: string;
    sequence: number;
    semesters: {
      id: string;
      title: string;
      semesterNumber: number | null;
      sequence: number;
      periodType: string;
      isActive: boolean;
    }[];
  };
  assignmentsBySemester: Map<string, number>;
}) {
  const activeSemesters = year.semesters.filter(
    (semester) => semester.isActive,
  );
  const yearAssignmentCount = activeSemesters.reduce(
    (sum, semester) => sum + (assignmentsBySemester.get(semester.id) || 0),
    0,
  );

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-200/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
            Year {year.yearNumber}
          </p>

          <h3 className="mt-1 text-lg font-black text-slate-950">
            {year.title}
          </h3>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            {activeSemesters.length} semesters · {yearAssignmentCount} planned
            units
          </p>
        </div>

        <form action={deactivateAcademicYear}>
          <input type="hidden" name="intakeId" value={intakeId} />
          <input type="hidden" name="courseYearId" value={year.id} />

          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 px-3 text-[10px] font-black uppercase tracking-wider text-amber-700 transition-all hover:-translate-y-0.5"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Deactivate
          </button>
        </form>
      </div>

      {activeSemesters.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {activeSemesters.map((semester) => {
            const plannedUnits = assignmentsBySemester.get(semester.id) || 0;

            return (
              <div
                key={semester.id}
                className="rounded-2xl border border-slate-200 bg-slate-100/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {formatEnum(String(semester.periodType))}
                    </p>

                    <h4 className="mt-1 truncate text-sm font-black text-slate-950">
                      {semester.title}
                    </h4>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Sequence {semester.sequence} · {plannedUnits} planned
                      units
                    </p>
                  </div>

                  <form action={deactivateAcademicSemester}>
                    <input type="hidden" name="intakeId" value={intakeId} />
                    <input
                      type="hidden"
                      name="semesterId"
                      value={semester.id}
                    />

                    <button
                      type="submit"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-amber-700 transition-all hover:-translate-y-0.5 hover:bg-amber-100"
                      title="Deactivate semester"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-100/70 p-5 text-center">
          <CalendarDays className="mx-auto h-6 w-6 text-slate-400" />

          <p className="mt-2 text-sm font-black text-slate-700">
            No active semesters
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-500">
            Add a semester under this year before unit planning.
          </p>
        </div>
      )}
    </div>
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
    <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
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
    <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[22px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm duration-500">
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

function InputField({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  min,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  min?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black text-slate-700">{label}</label>

      <input
        type={type}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={min}
        required={required}
        className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all placeholder:font-semibold placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
      />
    </div>
  );
}

function DarkInput({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </label>

      <input
        type="number"
        name={name}
        min="1"
        max="6"
        defaultValue={defaultValue}
        className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white outline-none transition-all focus:border-sky-300 focus:ring-4 focus:ring-sky-300/10"
        required
      />
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  disabled = false,
}: {
  icon: ElementType;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
    >
      <Icon className="mr-2 h-5 w-5" />
      {label}
    </button>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-xs font-black text-slate-950">
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

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="m-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center sm:m-6">
      <CalendarDays className="h-8 w-8 text-slate-400" />

      <p className="mt-3 text-sm font-black text-slate-700">{title}</p>

      <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">
        {text}
      </p>
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
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${styles}`}>
      {message}
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
