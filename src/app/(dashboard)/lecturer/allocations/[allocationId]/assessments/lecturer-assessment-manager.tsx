"use client";

import type { ElementType, FormEvent } from "react";
import { useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileClock,
  GraduationCap,
  Layers3,
  Loader2,
  LockKeyhole,
  Plus,
  Scale,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import { createCatAssessment } from "@/app/actions/assessment.actions";
import { Button } from "@/components/ui/button";

type AssessmentRecord = {
  id: string;
  code: string;
  title: string;
  type: string;
  maxMarks: string;
  weightPercent: string | null;
  assessmentDate: string | null;
  createdAt: string;

  createdBy: {
    firstName: string;
    lastName: string;
  };

  submission: {
    id: string;
    status: string;
    version: number;
    resultCount: number;
    submittedToCoordinatorAt: string | null;
    coordinatorReviewedAt: string | null;
    submittedToAcademicDirectorAt: string | null;
    academicReviewedAt: string | null;
    finalApprovedAt: string | null;
    publishedAt: string | null;
  } | null;
};

type LecturerAllocation = {
  id: string;
  allocationRole: string;
  startsAt: string;

  intake: {
    id: string;
    code: string;
    title: string;
    year: number;
    status: string;
    studentCount: number;

    course: {
      id: string;
      code: string;
      title: string;
      category: string;
    };
  };

  unitAssignment: {
    id: string;

    unit: {
      id: string;
      code: string;
      title: string;
      description: string | null;
    };

    semester: {
      id: string;
      title: string;
      semesterNumber: number | null;
      periodType: string;

      courseYear: {
        id: string;
        title: string;
        yearNumber: number;
      };
    };
  };
};

type LecturerAssessmentManagerProps = {
  lecturer: {
    id: string;
    name: string;
  };

  allocation: LecturerAllocation;
  assessments: AssessmentRecord[];
};

export function LecturerAssessmentManager({
  lecturer,
  allocation,
  assessments,
}: LecturerAssessmentManagerProps) {
  const [assessmentType, setAssessmentType] = useState("CAT_1");

  const [isCreating, startCreateTransition] = useTransition();

  const router = useRouter();

  const isPrimaryLecturer = allocation.allocationRole === "PRIMARY";

  const catOne = assessments.find((assessment) => assessment.type === "CAT_1");

  const catTwo = assessments.find((assessment) => assessment.type === "CAT_2");

  const completedAssessments = assessments.filter(
    (assessment) =>
      assessment.submission?.status === "FINAL_APPROVED" ||
      assessment.submission?.status === "PUBLISHED",
  ).length;

  const publishedAssessments = assessments.filter(
    (assessment) => assessment.submission?.status === "PUBLISHED",
  ).length;

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isPrimaryLecturer) {
      toast.error(
        "Only the active primary lecturer can create official CAT assessments.",
      );
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    startCreateTransition(async () => {
      const result = await createCatAssessment(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message || "CAT assessment created successfully.");

      form.reset();
      setAssessmentType("CAT_1");
      router.refresh();
    });
  };

  const selectedTypeExists =
    assessmentType === "CAT_1" ? Boolean(catOne) : Boolean(catTwo);

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-5 overflow-hidden">
      <section className="relative isolate overflow-hidden rounded-3xl border border-border bg-primary text-primary-foreground shadow-lg shadow-primary/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_48%)]" />

        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent/25 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href="/lecturer/my-units"
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white/85 backdrop-blur transition-all hover:bg-white hover:text-primary"
              aria-label="Back to teaching units"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0">
              <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/85">
                <Sparkles className="h-3.5 w-3.5" />
                CAT Results Management
              </div>

              <h1 className="break-words text-2xl font-black text-white sm:text-3xl lg:text-4xl">
                {allocation.unitAssignment.unit.title}
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/75">
                Create CAT assessments and manage result sheets for{" "}
                {allocation.intake.code}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <HeroStat title="CATs" value={assessments.length} />

            <HeroStat title="Students" value={allocation.intake.studentCount} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          title="Unit Code"
          value={allocation.unitAssignment.unit.code}
          helper={allocation.intake.course.code}
        />

        <StatCard
          icon={Users}
          title="Students"
          value={`${allocation.intake.studentCount}`}
          helper={allocation.intake.code}
        />

        <StatCard
          icon={CheckCircle2}
          title="Final Approved"
          value={`${completedAssessments}`}
          helper="Completed review"
        />

        <StatCard
          icon={BadgeCheck}
          title="Published"
          value={`${publishedAssessments}`}
          helper="Visible to students"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[400px_1fr]">
        <form
          onSubmit={handleCreate}
          className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm xl:sticky xl:top-24 xl:self-start"
        >
          <div className="border-b border-border bg-muted/40 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Plus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-black text-foreground">
                  Create CAT Assessment
                </h2>

                <p className="text-xs font-semibold text-muted-foreground">
                  Creates a draft result sheet automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <input type="hidden" name="allocationId" value={allocation.id} />

            {!isPrimaryLecturer ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                  <div>
                    <p className="text-sm font-black text-amber-800">
                      Read-only assessment access
                    </p>

                    <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                      Only the primary lecturer can create official CAT
                      assessments.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <label
                htmlFor="assessmentType"
                className="flex items-center gap-1 text-sm font-black text-foreground/80"
              >
                <span>Assessment Type</span>
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </label>

              <select
                required
                id="assessmentType"
                name="assessmentType"
                value={assessmentType}
                onChange={(event) => setAssessmentType(event.target.value)}
                disabled={!isPrimaryLecturer}
                className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
              >
                <option value="CAT_1">
                  CAT 1 {catOne ? "— Already created" : ""}
                </option>

                <option value="CAT_2">
                  CAT 2 {catTwo ? "— Already created" : ""}
                </option>
              </select>
            </div>

            {selectedTypeExists ? (
              <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                <p className="text-sm font-black text-sky-800">
                  This CAT already exists
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 text-sky-700">
                  Select the other CAT type or open the existing result sheet.
                </p>
              </div>
            ) : null}

            <InputField
              name="code"
              label="Custom Code"
              placeholder={assessmentType === "CAT_1" ? "CAT1" : "CAT2"}
              disabled={!isPrimaryLecturer}
              required={false}
            />

            <InputField
              name="title"
              label="Custom Title"
              placeholder={
                assessmentType === "CAT_1"
                  ? "Continuous Assessment Test 1"
                  : "Continuous Assessment Test 2"
              }
              disabled={!isPrimaryLecturer}
              required={false}
            />

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                name="maxMarks"
                label="Maximum Marks"
                defaultValue="30"
                min="1"
                max="1000"
                step="0.01"
                disabled={!isPrimaryLecturer}
              />

              <NumberField
                name="weightPercent"
                label="Weight (%)"
                defaultValue="15"
                min="0"
                max="100"
                step="0.01"
                disabled={!isPrimaryLecturer}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="assessmentDate"
                className="text-sm font-black text-foreground/80"
              >
                Assessment Date
              </label>

              <input
                type="date"
                id="assessmentDate"
                name="assessmentDate"
                disabled={!isPrimaryLecturer}
                className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
              />
            </div>

            <Button
              type="submit"
              disabled={!isPrimaryLecturer || isCreating || selectedTypeExists}
              className="h-12 w-full rounded-2xl font-black"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating CAT...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Assessment
                </>
              )}
            </Button>
          </div>
        </form>

        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="border-b border-border bg-muted/40 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ClipboardList className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-black text-foreground">
                  Assessment Result Sheets
                </h2>

                <p className="text-xs font-semibold text-muted-foreground">
                  CAT assessments for this intake and approved unit.
                </p>
              </div>
            </div>
          </div>

          {assessments.length === 0 ? (
            <EmptyAssessments />
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              {assessments.map((assessment) => (
                <AssessmentCard
                  key={assessment.id}
                  assessment={assessment}
                  studentCount={allocation.intake.studentCount}
                  allocationId={allocation.id}
                />
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 p-5">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-primary" />

            <h2 className="font-black text-foreground">
              Allocation Information
            </h2>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <DetailCard label="Lecturer" value={lecturer.name} />

          <DetailCard
            label="Teaching Role"
            value={formatEnum(allocation.allocationRole)}
          />

          <DetailCard
            label="Academic Period"
            value={`${allocation.unitAssignment.semester.courseYear.title} — ${allocation.unitAssignment.semester.title}`}
          />

          <DetailCard
            label="Intake"
            value={`${allocation.intake.code} — ${allocation.intake.title}`}
          />
        </div>
      </section>
    </div>
  );
}

function AssessmentCard({
  assessment,
  studentCount,
  allocationId,
}: {
  assessment: AssessmentRecord;
  studentCount: number;
  allocationId: string;
}) {
  const status = assessment.submission?.status || "DRAFT";

  const enteredResults = assessment.submission?.resultCount || 0;

  const progress =
    studentCount > 0
      ? Math.min(100, Math.round((enteredResults / studentCount) * 100))
      : 0;

  return (
    <article className="relative overflow-hidden rounded-3xl border border-border bg-background p-4 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary via-secondary to-accent" />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-primary">
              {formatEnum(assessment.type)}
            </p>

            <h3 className="mt-1 break-words font-black text-foreground">
              {assessment.title}
            </h3>

            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {assessment.code}
            </p>
          </div>

          <WorkflowStatusBadge status={status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniDetail
            icon={Scale}
            label="Maximum"
            value={assessment.maxMarks}
          />

          <MiniDetail
            icon={BadgeCheck}
            label="Weight"
            value={
              assessment.weightPercent
                ? `${assessment.weightPercent}%`
                : "Not set"
            }
          />

          <MiniDetail
            icon={CalendarDays}
            label="Assessment Date"
            value={
              assessment.assessmentDate
                ? formatDate(assessment.assessmentDate)
                : "Not set"
            }
          />

          <MiniDetail
            icon={ClipboardList}
            label="Version"
            value={`${assessment.submission?.version || 1}`}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-muted-foreground">
              Results entered
            </span>

            <span className="font-black text-foreground">
              {enteredResults}/{studentCount}
            </span>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>

        <Link
          href={`/lecturer/allocations/${allocationId}/assessments/${assessment.id}`}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-sm transition-all hover:bg-primary/90"
        >
          <ClipboardList className="h-4 w-4" />
          Open Result Sheet
        </Link>
      </div>
    </article>
  );
}

function WorkflowStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "border-slate-500/20 bg-slate-500/10 text-slate-700",

    SUBMITTED_TO_COORDINATOR: "border-sky-500/20 bg-sky-500/10 text-sky-700",

    RETURNED_TO_LECTURER: "border-amber-500/20 bg-amber-500/10 text-amber-700",

    SUBMITTED_TO_ACADEMIC_DIRECTOR:
      "border-violet-500/20 bg-violet-500/10 text-violet-700",

    RETURNED_TO_COORDINATOR:
      "border-orange-500/20 bg-orange-500/10 text-orange-700",

    FINAL_APPROVED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",

    PUBLISHED: "border-teal-500/20 bg-teal-500/10 text-teal-700",

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

function InputField({
  name,
  label,
  placeholder,
  disabled,
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  disabled: boolean;
  required: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-black text-foreground/80">
        {label}
      </label>

      <input
        type="text"
        id={name}
        name={name}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-semibold outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
      />
    </div>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
  min,
  max,
  step,
  disabled,
}: {
  name: string;
  label: string;
  defaultValue: string;
  min: string;
  max: string;
  step: string;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="flex items-center gap-1 text-sm font-black text-foreground/80"
      >
        <span>{label}</span>
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      </label>

      <input
        required
        type="number"
        id={name}
        name={name}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm font-bold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
      />
    </div>
  );
}

function MiniDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-primary" />

      <p className="mt-2 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-black text-foreground">
        {value}
      </p>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-black text-foreground">
        {value}
      </p>
    </div>
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
  icon: ElementType;
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {title}
          </p>

          <p className="mt-2 break-words text-2xl font-black text-foreground">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        {helper}
      </p>
    </div>
  );
}

function EmptyAssessments() {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <ClipboardList className="h-8 w-8" />
      </div>

      <p className="mt-4 text-lg font-black text-foreground">
        No CAT assessments created
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
        The primary lecturer can create CAT 1 and CAT 2 result sheets using the
        form.
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
