"use client";

import type { ElementType } from "react";

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
  Clock3,
  FileClock,
  GraduationCap,
  Layers3,
  Loader2,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { reviewSemesterUnitAssignments } from "@/app/actions/semester-unit-review.actions";

type SubmittedAssignment = {
  id: string;
  status: string;
  submittedAt: string | null;
  unit: {
    id: string;
    code: string;
    title: string;
    description: string | null;
  };
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  submittedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

type ReviewSemester = {
  id: string;
  title: string;
  semesterNumber: number | null;
  sequence: number;
  periodType: string;
  courseYear: {
    title: string;
    yearNumber: number;
  };
  course: {
    id: string;
    code: string;
    title: string;
    category: string;
  };
  assignments: SubmittedAssignment[];
};

type UnitApprovalManagerProps = {
  reviewer: {
    id: string;
    name: string;
    role: string;
  };
  reviews: ReviewSemester[];
};

type ReviewDecision = "APPROVE" | "REJECT" | "AMENDMENT";

export function UnitApprovalManager({
  reviewer,
  reviews,
}: UnitApprovalManagerProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [activeReview, setActiveReview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  const totalUnits = reviews.reduce(
    (total, semester) => total + semester.assignments.length,
    0,
  );

  const coursesAwaitingReview = new Set(
    reviews.map((semester) => semester.course.id),
  ).size;

  const submittedDates = reviews
    .flatMap((semester) =>
      semester.assignments.map((assignment) => assignment.submittedAt),
    )
    .filter((value): value is string => Boolean(value))
    .sort(
      (first, second) =>
        new Date(first).getTime() - new Date(second).getTime(),
    );

  const oldestSubmission = submittedDates[0] || null;

  const handleReview = (
    semester: ReviewSemester,
    decision: ReviewDecision,
  ) => {
    const note = notes[semester.id]?.trim() || "";

    if (decision === "REJECT" && !note) {
      toast.error("Enter a rejection reason before rejecting.");
      return;
    }

    if (decision === "AMENDMENT" && !note) {
      toast.error("Explain the amendments required before continuing.");
      return;
    }

    const decisionLabel =
      decision === "APPROVE"
        ? "approve"
        : decision === "REJECT"
          ? "reject"
          : "request amendments for";

    const confirmed = window.confirm(
      `Are you sure you want to ${decisionLabel} ${semester.assignments.length} unit assignment${
        semester.assignments.length === 1 ? "" : "s"
      } in ${semester.courseYear.title} — ${semester.title}?`,
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("courseId", semester.course.id);
    formData.set("semesterId", semester.id);
    formData.set("decision", decision);
    formData.set("note", note);

    const reviewKey = `${semester.id}-${decision}`;
    setActiveReview(reviewKey);

    startTransition(async () => {
      try {
        const result = await reviewSemesterUnitAssignments(formData);

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success(
          result.message || "Semester assignments reviewed successfully.",
        );

        setNotes((current) => {
          const next = { ...current };
          delete next[semester.id];
          return next;
        });

        router.refresh();
      } finally {
        setActiveReview(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href="/academic-director/courses"
              aria-label="Back to courses"
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0 animate-in fade-in slide-in-from-left-3 duration-500">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
                Academic Approval Queue
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Semester Unit Approvals
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
                Review submitted unit assignments before they become active.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <HeroStat label="Semesters" value={reviews.length} />
            <HeroStat label="Units" value={totalUnits} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FileClock}
          label="Semesters"
          value={`${reviews.length}`}
          helper="Awaiting review"
        />

        <StatCard
          icon={Layers3}
          label="Units"
          value={`${totalUnits}`}
          helper="Submitted assignments"
        />

        <StatCard
          icon={BookOpen}
          label="Courses"
          value={`${coursesAwaitingReview}`}
          helper="With pending reviews"
        />

        <StatCard
          icon={Clock3}
          label="Oldest"
          value={oldestSubmission ? formatDate(oldestSubmission) : "None"}
          helper="Queue age"
        />
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Pending Reviews
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950">
                Submitted Semester Units
              </h2>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                Reviewing as {reviewer.name} — {formatEnum(reviewer.role)}
              </p>
            </div>
          </div>

          <span className="w-fit rounded-full bg-sky-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-sky-700">
            {reviews.length} awaiting review
          </span>
        </div>

        {reviews.length === 0 ? (
          <EmptyApprovalQueue />
        ) : (
          <div className="mt-5 space-y-5">
            {reviews.map((semester) => (
              <ReviewCard
                key={semester.id}
                semester={semester}
                note={notes[semester.id] || ""}
                onNoteChange={(value) =>
                  setNotes((current) => ({
                    ...current,
                    [semester.id]: value,
                  }))
                }
                onReview={handleReview}
                isPending={isPending}
                activeReview={activeReview}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ReviewCard({
  semester,
  note,
  onNoteChange,
  onReview,
  isPending,
  activeReview,
}: {
  semester: ReviewSemester;
  note: string;
  onNoteChange: (value: string) => void;
  onReview: (semester: ReviewSemester, decision: ReviewDecision) => void;
  isPending: boolean;
  activeReview: string | null;
}) {
  const firstSubmission =
    semester.assignments
      .map((assignment) => assignment.submittedAt)
      .filter((value): value is string => Boolean(value))
      .sort(
        (first, second) =>
          new Date(first).getTime() - new Date(second).getTime(),
      )[0] || null;

  const submittedBy =
    semester.assignments.find((assignment) => assignment.submittedBy)
      ?.submittedBy || null;

  const isReviewingThisSemester =
    activeReview?.startsWith(`${semester.id}-`) || false;

  return (
    <article className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-200/50 shadow-sm">
      <div className="border-b border-slate-200 bg-slate-100/80 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-sky-700">
                {semester.course.code} · {formatEnum(semester.course.category)}
              </p>

              <h3 className="mt-1 break-words text-lg font-black text-slate-950">
                {semester.course.title}
              </h3>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {semester.courseYear.title} — {semester.title}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <InfoBadge
              icon={Layers3}
              text={`${semester.assignments.length} unit${
                semester.assignments.length === 1 ? "" : "s"
              }`}
            />

            <InfoBadge
              icon={CalendarDays}
              text={firstSubmission ? formatDateTime(firstSubmission) : "No date"}
            />
          </div>
        </div>

        {submittedBy ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Submitted by
            </p>

            <p className="mt-1 text-sm font-black text-slate-950">
              {submittedBy.firstName} {submittedBy.lastName}
            </p>

            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {submittedBy.email}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {semester.assignments.map((assignment) => (
          <UnitCard key={assignment.id} assignment={assignment} />
        ))}
      </div>

      <div className="border-t border-slate-200 bg-slate-100/80 p-5">
        <div className="grid gap-5 xl:grid-cols-[1fr_440px]">
          <div className="space-y-2">
            <label
              htmlFor={`review-note-${semester.id}`}
              className="flex items-center gap-2 text-sm font-black text-slate-950"
            >
              <MessageSquareText className="h-4 w-4 text-sky-700" />
              Review note or reason
            </label>

            <textarea
              id={`review-note-${semester.id}`}
              rows={4}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
              disabled={isPending && isReviewingThisSemester}
              placeholder="Optional for approval. Required when rejecting or requesting amendments."
              className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-200/60 px-4 py-3 text-sm font-semibold leading-6 text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <ReviewButton
              label="Approve All"
              icon={CheckCircle2}
              tone="approve"
              loading={activeReview === `${semester.id}-APPROVE`}
              disabled={isPending && isReviewingThisSemester}
              onClick={() => onReview(semester, "APPROVE")}
            />

            <ReviewButton
              label="Request Amendments"
              icon={RotateCcw}
              tone="amend"
              loading={activeReview === `${semester.id}-AMENDMENT`}
              disabled={isPending && isReviewingThisSemester}
              onClick={() => onReview(semester, "AMENDMENT")}
            />

            <ReviewButton
              label="Reject All"
              icon={XCircle}
              tone="reject"
              loading={activeReview === `${semester.id}-REJECT`}
              disabled={isPending && isReviewingThisSemester}
              onClick={() => onReview(semester, "REJECT")}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function UnitCard({ assignment }: { assignment: SubmittedAssignment }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-100/80 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 px-1 text-center text-[10px] font-black text-sky-700">
          {assignment.unit.code.slice(0, 5)}
        </div>

        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">
            {assignment.unit.title}
          </p>

          <p className="mt-1 text-xs font-black uppercase tracking-wider text-sky-700">
            {assignment.unit.code}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-xs font-semibold leading-5 text-slate-500">
        {assignment.unit.description || "No unit description provided."}
      </p>
    </div>
  );
}

function ReviewButton({
  label,
  icon: Icon,
  tone,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  icon: ElementType;
  tone: "approve" | "amend" | "reject";
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === "approve"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : tone === "amend"
        ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
        : "bg-rose-100 text-rose-700 hover:bg-rose-200";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-black transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 ${toneClass}`}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Icon className="mr-2 h-4 w-4" />
      )}
      {label}
    </button>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[96px] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center">
      <p className="text-xl font-black text-white">{value}</p>

      <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
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

          <p className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

function InfoBadge({
  icon: Icon,
  text,
}: {
  icon: ElementType;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
      <Icon className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}

function EmptyApprovalQueue() {
  return (
    <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center">
      <BadgeCheck className="h-9 w-9 text-emerald-700" />

      <p className="mt-4 text-lg font-black text-slate-800">
        Approval queue is clear
      </p>

      <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
        There are no submitted semester-unit assignments waiting for review.
      </p>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .replace(/_/g, " ")
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
