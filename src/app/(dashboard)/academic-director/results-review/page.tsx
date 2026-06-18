import type { ElementType } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Send,
  ShieldCheck,
  Undo2,
  Users,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  finalApproveResults,
  publishResults,
  returnResultsToCoordinator,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AcademicDirectorResultsReviewPage() {
  const session = await auth();
  if (!session?.user?.id) return { redirect: "/login" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      isActive: true,
      accountStatus: true,
      role: { select: { name: true } },
    },
  });

  if (
    !user ||
    !user.isActive ||
    user.accountStatus !== "ACTIVE" ||
    !["academic_director", "super_admin"].includes(user.role.name)
  ) {
    return { redirect: "/unauthorized" };
  }

  const submissions = await prisma.resultSubmission.findMany({
    where: {
      status: {
        in: [
          "SUBMITTED_TO_ACADEMIC_DIRECTOR",
          "RETURNED_TO_COORDINATOR",
          "FINAL_APPROVED",
          "PUBLISHED",
        ],
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      coordinatorComment: true,
      academicComment: true,
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
      results: { select: { marks: true, isAbsent: true, isExempted: true } },
    },
  });

  const pending = submissions.filter(
    (s) => s.status === "SUBMITTED_TO_ACADEMIC_DIRECTOR",
  ).length;
  const approved = submissions.filter(
    (s) => s.status === "FINAL_APPROVED",
  ).length;
  const published = submissions.filter((s) => s.status === "PUBLISHED").length;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-7">
        <div className="relative animate-in fade-in slide-in-from-left-3 duration-500">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
            Academic Director
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            Final Results Review
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-400">
            Review coordinator-forwarded results and publish CAT marks.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={ClipboardCheck}
          label="Pending Review"
          value={pending}
          tone="sky"
        />
        <StatCard
          icon={CheckCircle2}
          label="Ready to Publish"
          value={approved}
          tone="emerald"
        />
        <StatCard
          icon={Send}
          label="Published"
          value={published}
          tone="slate"
        />
      </section>

      <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6">
          <h2 className="text-lg font-black text-slate-950">Review Queue</h2>
        </div>

        {submissions.length === 0 ? (
          <EmptyState
            title="All clear"
            text="No result submissions currently require Academic Director review."
          />
        ) : (
          <div className="divide-y divide-slate-100">
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
              const canApprove =
                submission.status === "SUBMITTED_TO_ACADEMIC_DIRECTOR";
              const canPublish = submission.status === "FINAL_APPROVED";
              const canPublishToStudents = ["CAT_1", "CAT_2"].includes(
                String(submission.assessment.type),
              );

              return (
                <div
                  key={submission.id}
                  className="p-6 transition-colors hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-black text-slate-950">
                          {submission.assessment.code} ·{" "}
                          {submission.assessment.title}
                        </h3>
                        <StatusBadge status={submission.status} />
                      </div>
                      <p className="text-xs font-semibold text-slate-500">
                        {submission.assessment.intake.code} ·{" "}
                        {submission.assessment.unitAssignment.unit.code} ·{" "}
                        {lecturerName}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Metric label="Marked" value={summary.marked} />
                      <Metric label="Absent" value={summary.absent} />
                      <Metric label="Avg" value={summary.average} />
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    {canApprove && (
                      <>
                        <form
                          action={finalApproveResults as any}
                          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                        >
                          <input
                            type="hidden"
                            name="submissionId"
                            value={submission.id}
                          />
                          <textarea
                            name="comment"
                            placeholder="Approval note"
                            className="w-full rounded-lg border-0 bg-white/50 p-2 text-xs font-bold"
                          />
                          <button className="mt-2 w-full rounded-xl bg-emerald-700 py-2 text-xs font-black text-white">
                            Approve
                          </button>
                        </form>
                        <form
                          action={returnResultsToCoordinator as any}
                          className="rounded-2xl border border-amber-200 bg-amber-50 p-4"
                        >
                          <input
                            type="hidden"
                            name="submissionId"
                            value={submission.id}
                          />
                          <textarea
                            required
                            name="comment"
                            placeholder="Reason for return"
                            className="w-full rounded-lg border-0 bg-white/50 p-2 text-xs font-bold"
                          />
                          <button className="mt-2 w-full rounded-xl bg-amber-600 py-2 text-xs font-black text-white">
                            Return
                          </button>
                        </form>
                      </>
                    )}
                    {canPublish && (
                      <form
                        action={publishResults as any}
                        className="rounded-2xl border border-sky-200 bg-sky-50 p-4"
                      >
                        <input
                          type="hidden"
                          name="submissionId"
                          value={submission.id}
                        />
                        <p className="mb-2 text-[10px] font-bold text-sky-800">
                          {canPublishToStudents
                            ? "CAT ready for student portal."
                            : "Exam hidden from portal."}
                        </p>
                        <button
                          disabled={!canPublishToStudents}
                          className="w-full rounded-xl bg-sky-700 py-2 text-xs font-black text-white disabled:bg-slate-300"
                        >
                          Publish to Portal
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// Reusable components for clean code
function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: number;
  tone: "sky" | "emerald" | "slate";
}) {
  const styles = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-2xl font-black">{value}</p>
        <div
          className={`p-2 rounded-xl ${styles[tone]} border border-current/10`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-center">
      <p className="text-[9px] font-black uppercase text-slate-400">{label}</p>
      <p className="text-sm font-black">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SUBMITTED_TO_ACADEMIC_DIRECTOR: "bg-violet-100 text-violet-700",
    FINAL_APPROVED: "bg-emerald-100 text-emerald-700",
    PUBLISHED: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[9px] font-black ${styles[status] ?? "bg-slate-100"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-10 text-center text-slate-500 font-bold">
      {title}: {text}
    </div>
  );
}

function summarizeResults(
  results: { marks: any; isAbsent: boolean; isExempted: boolean }[],
  maxMarks: number,
) {
  const m = results
    .filter((r) => !r.isAbsent && !r.isExempted && r.marks !== null)
    .map((r) => Number(r.marks));
  return {
    marked: m.length,
    absent: results.filter((r) => r.isAbsent).length,
    average: m.length
      ? `${(m.reduce((a, b) => a + b, 0) / m.length).toFixed(1)}/${maxMarks}`
      : "—",
  };
}
