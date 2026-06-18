import type { ElementType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MessageSquare,
  Send,
  ShieldCheck,
  Undo2,
  Users,
} from "lucide-react";

import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";

import {
  forwardResultsToAcademicDirector,
  returnResultsToLecturer,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function CoordinatorResultsPage() {
  const scope = await requireCoordinatorScope();

  const where = scope.isGlobal
    ? {}
    : {
        assessment: {
          intakeId: scope.intakeId!,
        },
      };

  const submissions = await prisma.resultSubmission.findMany({
    where: where as any,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      version: true,
      submittedToCoordinatorAt: true,
      coordinatorComment: true,
      academicComment: true,
      createdAt: true,
      assessment: {
        select: {
          code: true,
          title: true,
          type: true,
          maxMarks: true,
          intake: {
            select: {
              code: true,
              title: true,
              year: true,
              course: { select: { code: true, title: true } },
            },
          },
          unitAssignment: {
            select: {
              unit: { select: { code: true, title: true } },
              semester: {
                select: {
                  title: true,
                  courseYear: { select: { title: true } },
                },
              },
            },
          },
          lecturerAllocation: {
            select: {
              lecturer: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
        },
      },
      results: {
        select: {
          marks: true,
          isAbsent: true,
          isExempted: true,
        },
      },
    },
  });

  const awaitingReview = submissions.filter(
    (submission) =>
      submission.status === "SUBMITTED_TO_COORDINATOR" ||
      submission.status === "RETURNED_TO_COORDINATOR",
  ).length;
  const forwarded = submissions.filter(
    (submission) => submission.status === "SUBMITTED_TO_ACADEMIC_DIRECTOR",
  ).length;
  const published = submissions.filter(
    (submission) => submission.status === "PUBLISHED",
  ).length;

  const classLabel = scope.isGlobal
    ? "All intakes"
    : scope.intake?.code || "Assigned intake";
  const description = scope.isGlobal
    ? "Super Administrator view of coordinator result workflows."
    : `${scope.intake?.title} · ${scope.intake?.course.code} - ${scope.intake?.course.title}`;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Coordinator Review
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              CAT Results
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              {description}
            </p>
          </div>

          <Link
            href="/coordinator/lecturer-allocation"
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            Lecturer Allocation
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FileText}
          label="Sheets"
          value={submissions.length}
          helper="Result submissions"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Review"
          value={awaitingReview}
          helper="Awaiting coordinator"
        />
        <StatCard
          icon={Send}
          label="Forwarded"
          value={forwarded}
          helper="With Academic Director"
        />
        <StatCard
          icon={CheckCircle2}
          label="Published"
          value={published}
          helper="Released CATs"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
          <SectionHeader
            icon={ClipboardCheck}
            title="Submitted Result Sheets"
            subtitle={`Showing results for ${classLabel}.`}
          />

          {submissions.length === 0 ? (
            <EmptyState
              title="No result submissions"
              text="Lecturer submissions will appear here after they submit results."
            />
          ) : (
            <div className="divide-y divide-slate-200 px-5 sm:px-6">
              {submissions.map((submission) => {
                const lecturer =
                  submission.assessment.lecturerAllocation.lecturer;
                const lecturerName =
                  [lecturer.firstName, lecturer.lastName]
                    .filter(Boolean)
                    .join(" ") || lecturer.email;
                const summary = summarizeResults(
                  submission.results,
                  Number(submission.assessment.maxMarks),
                );
                const canReview =
                  submission.status === "SUBMITTED_TO_COORDINATOR" ||
                  submission.status === "RETURNED_TO_COORDINATOR";

                return (
                  <div
                    key={submission.id}
                    className="py-5 first:pt-5 last:pb-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-slate-950">
                            {submission.assessment.code} ·{" "}
                            {submission.assessment.title}
                          </p>
                          <StatusBadge status={submission.status} />
                        </div>

                        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                          {submission.assessment.unitAssignment.unit.code} ·{" "}
                          {submission.assessment.unitAssignment.unit.title}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
                            <CalendarDays className="h-3 w-3 text-sky-700" />
                            {submission.assessment.intake.code}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
                            <Users className="h-3 w-3 text-emerald-700" />
                            {lecturerName}
                          </span>
                        </div>
                      </div>

                      <div className="grid shrink-0 grid-cols-3 gap-2">
                        <MiniMetric label="Marked" value={summary.marked} />
                        <MiniMetric label="Absent" value={summary.absent} />
                        <MiniMetric label="Average" value={summary.average} />
                      </div>
                    </div>

                    {submission.academicComment ? (
                      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-violet-800">
                            Academic Director returned note
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-violet-900">
                            {submission.academicComment}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {canReview && !scope.isGlobal ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <form
                          action={forwardResultsToAcademicDirector as any}
                          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition-all hover:border-emerald-300"
                        >
                          <input
                            type="hidden"
                            name="submissionId"
                            value={submission.id}
                          />
                          <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-emerald-800">
                            Approve & Forward
                          </label>
                          <textarea
                            name="comment"
                            placeholder="Optional note to Academic Director"
                            className="min-h-16 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                          />
                          <button
                            type="submit"
                            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-black text-white transition-all hover:bg-emerald-700"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Forward to Academic Director
                          </button>
                        </form>

                        {submission.status === "SUBMITTED_TO_COORDINATOR" ? (
                          <form
                            action={returnResultsToLecturer as any}
                            className="rounded-2xl border border-amber-200 bg-amber-50 p-4 transition-all hover:border-amber-300"
                          >
                            <input
                              type="hidden"
                              name="submissionId"
                              value={submission.id}
                            />
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-amber-800">
                              Reject & Return
                            </label>
                            <textarea
                              required
                              name="comment"
                              placeholder="Reason for return to lecturer"
                              className="min-h-16 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-600/10"
                            />
                            <button
                              type="submit"
                              className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-amber-500 px-4 text-xs font-black text-white transition-all hover:bg-amber-600"
                            >
                              <Undo2 className="mr-2 h-4 w-4" />
                              Return to Lecturer
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
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
                  Coordinator review is scoped.
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <GuideItem text="Lecturers enter results for allocated units." />
              <GuideItem text="Coordinator checks assigned intake only." />
              <GuideItem text="Academic Director gives final approval." />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
              Assigned Class
            </p>
            <h2 className="mt-2 text-lg font-black tracking-tight">
              {classLabel}
            </h2>
            <div className="mt-5 space-y-3">
              <DarkInfo
                icon={CalendarDays}
                label="Intake"
                value={scope.isGlobal ? "Global" : scope.intake?.code || "N/A"}
              />
              <DarkInfo
                icon={BookOpen}
                label="Course"
                value={
                  scope.isGlobal
                    ? "All courses"
                    : `${scope.intake?.course.code} — ${scope.intake?.course.title}`
                }
              />
              <DarkInfo
                icon={GraduationCap}
                label="Workflow"
                value="Coordinator review gate"
              />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function summarizeResults(
  results: { marks: any; isAbsent: boolean; isExempted: boolean }[],
  maxMarks: number,
) {
  const markedValues = results
    .filter(
      (result) =>
        !result.isAbsent && !result.isExempted && result.marks !== null,
    )
    .map((result) => Number(result.marks));
  const absent = results.filter((result) => result.isAbsent).length;
  const average = markedValues.length
    ? `${(markedValues.reduce((sum, value) => sum + value, 0) / markedValues.length).toFixed(1)} / ${maxMarks}`
    : "—";

  return { marked: markedValues.length, absent, average };
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

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-3 text-center shadow-sm">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-slate-200 text-slate-700",
    SUBMITTED_TO_COORDINATOR: "border border-sky-200 bg-sky-100 text-sky-800",
    RETURNED_TO_LECTURER: "border border-amber-200 bg-amber-100 text-amber-800",
    SUBMITTED_TO_ACADEMIC_DIRECTOR:
      "border border-violet-200 bg-violet-100 text-violet-800",
    RETURNED_TO_COORDINATOR:
      "border border-amber-200 bg-amber-100 text-amber-800",
    FINAL_APPROVED: "border border-emerald-200 bg-emerald-100 text-emerald-800",
    PUBLISHED: "border border-emerald-200 bg-emerald-100 text-emerald-800",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${styles[status] ?? "bg-slate-200 text-slate-700"}`}
    >
      {formatEnum(status)}
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="m-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center sm:m-6">
      <FileText className="h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm font-black text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">
        {text}
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
