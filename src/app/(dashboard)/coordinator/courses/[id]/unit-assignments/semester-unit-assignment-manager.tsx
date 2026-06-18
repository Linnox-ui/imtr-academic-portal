"use client";

import type { FormEvent } from "react";
import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  FileClock,
  GraduationCap,
  Layers3,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  assignUnitToSemester,
  removeDraftUnitAssignment,
  submitSemesterUnitAssignments,
} from "@/app/actions/semester-unit-assignment.actions";

import { Button } from "@/components/ui/button";

type CourseUnit = {
  id: string;
  code: string;
  title: string;
  isActive: boolean;
};

type SemesterAssignment = {
  id: string;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  rejectionReason: string | null;
  unit: CourseUnit;
};

type SemesterRecord = {
  id: string;
  title: string;
  semesterNumber: number | null;
  sequence: number;
  periodType: string;
  isActive: boolean;
  assignments: SemesterAssignment[];
};

type CourseYear = {
  id: string;
  title: string;
  yearNumber: number;
  sequence: number;
  isActive: boolean;
  semesters: SemesterRecord[];
};

type CourseData = {
  id: string;
  code: string;
  title: string;
  category: string;
  units: CourseUnit[];
  years: CourseYear[];
};

export function SemesterUnitAssignmentManager({
  course,
}: {
  course: CourseData;
}) {
  const [isAssigning, startAssignTransition] = useTransition();
  const [isRemoving, startRemoveTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const router = useRouter();

  const totalPeriods = course.years.reduce(
    (total, year) => total + year.semesters.length,
    0,
  );

  const totalAssignments = course.years.reduce(
    (yearTotal, year) =>
      yearTotal +
      year.semesters.reduce(
        (semesterTotal, semester) =>
          semesterTotal + semester.assignments.length,
        0,
      ),
    0,
  );

  const draftAssignments = course.years.reduce(
    (yearTotal, year) =>
      yearTotal +
      year.semesters.reduce(
        (semesterTotal, semester) =>
          semesterTotal +
          semester.assignments.filter(
            (assignment) => assignment.status === "DRAFT",
          ).length,
        0,
      ),
    0,
  );

  const handleAssign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    startAssignTransition(async () => {
      const result = await assignUnitToSemester(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message || "Unit assigned successfully.");

      form.reset();
      router.refresh();
    });
  };

  const handleRemove = (assignment: SemesterAssignment) => {
    const confirmed = window.confirm(
      `Remove ${assignment.unit.code} — ${assignment.unit.title} from this semester?`,
    );

    if (!confirmed) {
      return;
    }

    startRemoveTransition(async () => {
      const result = await removeDraftUnitAssignment(assignment.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message || "Draft assignment removed.");

      router.refresh();
    });
  };

  const handleSubmitSemester = (semester: SemesterRecord) => {
    const draftCount = semester.assignments.filter(
      (assignment) => assignment.status === "DRAFT",
    ).length;

    if (draftCount === 0) {
      toast.error("This semester has no draft assignments to submit.");
      return;
    }

    const confirmed = window.confirm(
      `Submit ${draftCount} draft unit assignment${
        draftCount === 1 ? "" : "s"
      } from ${semester.title} for Academic Director approval? After submission, the semester will be locked until it is reviewed.`,
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();

    formData.set("courseId", course.id);
    formData.set("semesterId", semester.id);

    startSubmitTransition(async () => {
      const result = await submitSemesterUnitAssignments(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.message || "Semester assignments submitted successfully.",
      );

      router.refresh();
    });
  };

  const assignmentLocations = new Map<string, string>();

  course.years.forEach((year) => {
    year.semesters.forEach((semester) => {
      semester.assignments.forEach((assignment) => {
        if (!assignmentLocations.has(assignment.unit.id)) {
          assignmentLocations.set(
            assignment.unit.id,
            `${year.title} — ${semester.title}`,
          );
        }
      });
    });
  });

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-5 overflow-hidden">
      <section className="relative isolate overflow-hidden rounded-3xl border border-border bg-primary text-primary-foreground shadow-lg shadow-primary/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_48%)]" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href={`/academic-director/courses/${course.id}`}
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white/85 transition-all hover:bg-white hover:text-primary"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/85">
                <Sparkles className="h-3.5 w-3.5" />
                Coordinator Workspace
              </div>

              <h1 className="break-words text-2xl font-black text-white sm:text-3xl">
                {course.title}
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium text-white/75">
                Assign course units to academic semesters and prepare draft
                proposals for approval.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <HeroStat title="Periods" value={totalPeriods} />
            <HeroStat title="Drafts" value={draftAssignments} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          title="Available Units"
          value={course.units.length}
          helper="Active course units"
        />

        <StatCard
          icon={CalendarRange}
          title="Academic Periods"
          value={totalPeriods}
          helper="Semesters and blocks"
        />

        <StatCard
          icon={Layers3}
          title="Assignments"
          value={totalAssignments}
          helper="All workflow statuses"
        />

        <StatCard
          icon={FileClock}
          title="Draft Assignments"
          value={draftAssignments}
          helper="Not yet submitted"
        />
      </section>

      {course.years.length === 0 ? (
        <EmptyStructure />
      ) : (
        <section className="space-y-5">
          {course.years.map((year) => (
            <article
              key={year.id}
              className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
            >
              <div className="border-b border-border bg-muted/40 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <GraduationCap className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="font-black text-foreground">{year.title}</h2>

                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Year {year.yearNumber} • {year.semesters.length} academic
                      period
                      {year.semesters.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </div>

              {year.semesters.length === 0 ? (
                <div className="p-5 text-sm font-semibold text-muted-foreground">
                  No academic periods exist under this year.
                </div>
              ) : (
                <div className="grid gap-4 p-4 xl:grid-cols-2">
                  {year.semesters.map((semester) => (
                    <SemesterCard
                      key={semester.id}
                      courseId={course.id}
                      semester={semester}
                      courseUnits={course.units}
                      assignmentLocations={assignmentLocations}
                      isAssigning={isAssigning}
                      isRemoving={isRemoving}
                      isSubmitting={isSubmitting}
                      onAssign={handleAssign}
                      onRemove={handleRemove}
                      onSubmitSemester={handleSubmitSemester}
                    />
                  ))}
                </div>
              )}
            </article>
          ))}
        </section>
      )}

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />

            <div>
              <h2 className="font-black text-foreground">
                Current Stage: Draft Assignment
              </h2>

              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Draft units are not yet visible to lecturers or students.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-3">
          <WorkflowCard
            number="1"
            title="Assign units"
            text="Select a course unit and place it in the correct semester."
          />

          <WorkflowCard
            number="2"
            title="Review drafts"
            text="Confirm every unit is assigned to the correct year and semester."
          />

          <WorkflowCard
            number="3"
            title="Submit later"
            text="The next stage will submit drafts to the Academic Director."
          />
        </div>
      </section>
    </div>
  );
}

function SemesterCard({
  courseId,
  semester,
  courseUnits,
  assignmentLocations,
  isAssigning,
  isRemoving,
  isSubmitting,
  onAssign,
  onRemove,
  onSubmitSemester,
}: {
  courseId: string;
  semester: SemesterRecord;
  courseUnits: CourseUnit[];
  assignmentLocations: Map<string, string>;
  isAssigning: boolean;
  isRemoving: boolean;
  isSubmitting: boolean;
  onAssign: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (assignment: SemesterAssignment) => void;
  onSubmitSemester: (semester: SemesterRecord) => void;
}) {
  const draftCount = semester.assignments.filter(
    (assignment) => assignment.status === 'DRAFT',
  ).length;

  const submittedCount = semester.assignments.filter(
    (assignment) => assignment.status === 'SUBMITTED',
  ).length;

  const approvedCount = semester.assignments.filter(
    (assignment) => assignment.status === 'APPROVED',
  ).length;

  const rejectedCount = semester.assignments.filter(
    (assignment) => assignment.status === 'REJECTED',
  ).length;

  const isAwaitingApproval = submittedCount > 0;

  const availableUnitCount = courseUnits.filter(
    (unit) => !assignmentLocations.has(unit.id),
  ).length;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-background">
      <div className="border-b border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="break-words font-black text-foreground">
              {semester.title}
            </h3>

            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-primary">
              {formatEnum(semester.periodType)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {draftCount > 0 ? (
              <SemesterCountBadge
                label="Draft"
                count={draftCount}
                variant="draft"
              />
            ) : null}

            {submittedCount > 0 ? (
              <SemesterCountBadge
                label="Submitted"
                count={submittedCount}
                variant="submitted"
              />
            ) : null}

            {approvedCount > 0 ? (
              <SemesterCountBadge
                label="Approved"
                count={approvedCount}
                variant="approved"
              />
            ) : null}

            {rejectedCount > 0 ? (
              <SemesterCountBadge
                label="Rejected"
                count={rejectedCount}
                variant="rejected"
              />
            ) : null}

            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-primary">
              {semester.assignments.length} Unit
              {semester.assignments.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      <form
        onSubmit={onAssign}
        className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_auto]"
      >
        <input
          type="hidden"
          name="courseId"
          value={courseId}
        />

        <input
          type="hidden"
          name="semesterId"
          value={semester.id}
        />

        <select
          required
          name="unitId"
          disabled={
            availableUnitCount === 0 ||
            isAssigning ||
            isAwaitingApproval
          }
          className="h-11 min-w-0 rounded-xl border border-input bg-card px-3 text-sm font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">
            {isAwaitingApproval
              ? 'Locked while awaiting approval'
              : availableUnitCount === 0
                ? 'All units have been assigned'
                : 'Select course unit...'}
          </option>

          {courseUnits.map((unit) => {
            const assignedLocation = assignmentLocations.get(unit.id);
            const isAlreadyAssigned = Boolean(assignedLocation);

            return (
              <option
                key={unit.id}
                value={unit.id}
                disabled={isAlreadyAssigned}
              >
                {unit.code} — {unit.title}
                {assignedLocation
                  ? ` — Already in ${assignedLocation}`
                  : ''}
              </option>
            );
          })}
        </select>

        <Button
          type="submit"
          disabled={
            availableUnitCount === 0 ||
            isAssigning ||
            isAwaitingApproval
          }
          className="h-11 rounded-xl px-4 font-black"
        >
          {isAssigning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}

          <span className="ml-2">Assign</span>
        </Button>
      </form>

      {semester.assignments.length === 0 ? (
        <div className="p-5 text-center">
          <Layers3 className="mx-auto h-7 w-7 text-muted-foreground" />

          <p className="mt-2 text-sm font-black text-foreground">
            No units assigned
          </p>

          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Select a unit above to create a draft.
          </p>
        </div>
      ) : (
        <div className="space-y-2 p-4">
          {semester.assignments.map((assignment) => {
            const canRemove =
              assignment.status === 'DRAFT' ||
              assignment.status === 'REJECTED' ||
              assignment.status === 'AMENDMENT_REQUESTED';

            return (
              <div
                key={assignment.id}
                className="rounded-2xl border border-border bg-card p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 px-1 text-center text-[10px] font-black text-primary">
                    {assignment.unit.code.slice(0, 5)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-black text-foreground">
                      {assignment.unit.title}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {assignment.unit.code}
                    </p>
                  </div>

                  <AssignmentStatusBadge status={assignment.status} />

                  {canRemove && !isAwaitingApproval ? (
                    <button
                      type="button"
                      onClick={() => onRemove(assignment)}
                      disabled={isRemoving}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-rose-600 transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Remove ${assignment.unit.code}`}
                    >
                      {isRemoving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                </div>

                {assignment.status === 'REJECTED' &&
                assignment.rejectionReason ? (
                  <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-700">
                      Rejection Reason
                    </p>

                    <p className="mt-1 text-xs font-semibold leading-5 text-rose-700">
                      {assignment.rejectionReason}
                    </p>
                  </div>
                ) : null}

                {assignment.status === 'AMENDMENT_REQUESTED' &&
                assignment.reviewNote ? (
                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                      Amendment Requested
                    </p>

                    <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                      {assignment.reviewNote}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {isAwaitingApproval ? (
        <div className="border-t border-border bg-sky-500/5 p-4">
          <div className="flex items-start gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
            <FileClock className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />

            <div className="min-w-0">
              <p className="text-sm font-black text-sky-800">
                Awaiting Academic Director Approval
              </p>

              <p className="mt-1 text-xs font-semibold leading-5 text-sky-700">
                {submittedCount} submitted unit assignment
                {submittedCount === 1 ? '' : 's'} are locked until the review
                is completed.
              </p>
            </div>
          </div>
        </div>
      ) : draftCount > 0 ? (
        <div className="border-t border-border bg-muted/30 p-4">
          <button
            type="button"
            onClick={() => onSubmitSemester(semester)}
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit {draftCount} Draft
                {draftCount === 1 ? '' : 's'} for Approval
              </>
            )}
          </button>

          <p className="mt-2 text-center text-[11px] font-semibold text-muted-foreground">
            Submission locks this semester until the Academic Director reviews
            it.
          </p>
        </div>
      ) : approvedCount > 0 &&
        approvedCount === semester.assignments.length ? (
        <div className="border-t border-border bg-emerald-500/5 p-4">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

            <div>
              <p className="text-sm font-black text-emerald-800">
                Semester Units Approved
              </p>

              <p className="mt-1 text-xs font-semibold leading-5 text-emerald-700">
                All {approvedCount} unit assignment
                {approvedCount === 1 ? '' : 's'} in this semester have been
                approved.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SemesterCountBadge({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: 'draft' | 'submitted' | 'approved' | 'rejected';
}) {
  const styles: Record<
    'draft' | 'submitted' | 'approved' | 'rejected',
    string
  > = {
    draft:
      'border-slate-500/20 bg-slate-500/10 text-slate-700',
    submitted:
      'border-sky-500/20 bg-sky-500/10 text-sky-700',
    approved:
      'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
    rejected:
      'border-rose-500/20 bg-rose-500/10 text-rose-700',
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${styles[variant]}`}
    >
      {count} {label}
    </span>
  );
}

function AssignmentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "border-slate-500/20 bg-slate-500/10 text-slate-700",
    SUBMITTED: "border-sky-500/20 bg-sky-500/10 text-sky-700",
    APPROVED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    REJECTED: "border-rose-500/20 bg-rose-500/10 text-rose-700",
    AMENDMENT_REQUESTED: "border-amber-500/20 bg-amber-500/10 text-amber-700",
    ARCHIVED: "border-zinc-500/20 bg-zinc-500/10 text-zinc-700",
  };

  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        styles[status] || "border-border bg-muted text-muted-foreground"
      }`}
    >
      {formatEnum(status)}
    </span>
  );
}

function HeroStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="min-w-[100px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-wider text-white/60">
        {title}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  helper,
}: {
  icon: typeof BookOpen;
  title: string;
  value: number;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {title}
          </p>

          <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        {helper}
      </p>
    </div>
  );
}

function WorkflowCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary text-xs font-black text-primary-foreground">
          {number}
        </span>

        <p className="font-black text-foreground">{title}</p>
      </div>

      <p className="mt-3 text-xs font-semibold leading-5 text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

function EmptyStructure() {
  return (
    <div className="rounded-3xl border border-border bg-card px-5 py-14 text-center shadow-sm">
      <CalendarRange className="mx-auto h-10 w-10 text-muted-foreground" />

      <p className="mt-4 text-lg font-black text-foreground">
        No course structure found
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-muted-foreground">
        The Academic Director must create years and semesters before units can
        be assigned.
      </p>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
