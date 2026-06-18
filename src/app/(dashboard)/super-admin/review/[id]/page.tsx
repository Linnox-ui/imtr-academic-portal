import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  RotateCcw,
  Trash2,
  CheckCircle,
  FileText,
  Users,
  Target,
  BarChart3,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// IMPORT THE SERVER ACTIONS
import {
  forcePublishAction,
  revertToDraftAction,
  deleteSubmissionAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function SuperAdminResultReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) redirect("/login");
  const role = (session.user.role || "").toUpperCase();
  if (role !== "SUPER_ADMIN") redirect("/unauthorized");

  const submission = await prisma.resultSubmission.findUnique({
    where: { id },
    include: {
      assessment: {
        include: {
          unitAssignment: { include: { unit: true } },
          intake: { include: { course: true } },
        },
      },
      results: {
        include: {
          student: true,
          studentProfile: { include: { user: true } },
        },
      },
      createdBy: { select: { firstName: true, lastName: true, role: true } },
      coordinatorReviewedBy: {
        select: { firstName: true, lastName: true, role: true },
      },
    },
  });

  if (!submission) {
    return (
      <div className="mx-auto max-w-4xl pt-20 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-black text-slate-900">
          Submission Not Found
        </h2>
        <p className="text-slate-500 mt-2 mb-6">
          This assessment record may have been deleted or does not exist.
        </p>
        <Link
          href="/super-admin"
          className="text-indigo-600 font-bold hover:underline"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Safely handle the maxMarks Decimal object
  const passThreshold = Number(submission.assessment.maxMarks) / 2;
  const maxMarksString = submission.assessment.maxMarks.toString();

  let totalAssessed = 0;
  let totalPasses = 0;
  let cumulativeScore = 0;

  const processedResults = submission.results
    .map((result) => {
      const marks = Number(result.marks || 0);
      const passed = marks >= passThreshold;

      if (!result.isAbsent && !result.isExempted && result.marks !== null) {
        totalAssessed++;
        cumulativeScore += marks;
        if (passed) totalPasses++;
      }

      return { ...result, marks, passed };
    })
    .sort((a, b) => b.marks - a.marks);

  const passRate =
    totalAssessed > 0 ? Math.round((totalPasses / totalAssessed) * 100) : 0;
  const averageScore =
    totalAssessed > 0 ? (cumulativeScore / totalAssessed).toFixed(1) : "0.0";
  const isReturned =
    submission.status === "RETURNED_TO_COORDINATOR" ||
    submission.status === "RETURNED_TO_LECTURER";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <Link
          href="/super-admin/review"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Master List
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
              submission.status === "PUBLISHED"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : isReturned
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            Status: {submission.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 sm:px-8 sm:py-8 text-white shadow-md border border-slate-800">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-[80px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">
                Super Admin Override Access
              </p>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl mb-1">
              {submission.assessment.title}
            </h1>
            <p className="text-sm font-medium text-slate-300">
              {submission.assessment.unitAssignment.unit.code} -{" "}
              {submission.assessment.unitAssignment.unit.title}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-6">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                <span className="font-bold text-white">Submitted By:</span>
                {submission.createdBy.firstName} {submission.createdBy.lastName}{" "}
                ({String(submission.createdBy.role).replace(/_/g, " ")})
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-[200px]">
            {submission.status !== "PUBLISHED" && (
              <form action={forcePublishAction.bind(null, submission.id)}>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  <CheckCircle className="h-4 w-4" /> Force Publish
                </button>
              </form>
            )}

            {submission.status === "PUBLISHED" && (
              <form action={revertToDraftAction.bind(null, submission.id)}>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" /> Revert to Draft
                </button>
              </form>
            )}

            <form action={deleteSubmissionAction.bind(null, submission.id)}>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 w-full bg-white/10 hover:bg-rose-500/20 text-white hover:text-rose-400 border border-white/10 hover:border-rose-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                <Trash2 className="h-4 w-4" /> Delete Submission
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-slate-400" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Students
            </p>
          </div>
          <p className="text-2xl font-black text-slate-900">{totalAssessed}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-slate-400" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Max Marks
            </p>
          </div>
          <p className="text-2xl font-black text-slate-900">{maxMarksString}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-indigo-400" />
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">
              Average
            </p>
          </div>
          <p className="text-2xl font-black text-indigo-600">{averageScore}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
              Pass Rate
            </p>
          </div>
          <p className="text-2xl font-black text-emerald-600">{passRate}%</p>
        </div>
      </section>

      <section className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-500" />
            Raw Score Data
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="px-6 py-4">Student Info</th>
                  <th className="px-6 py-4">Admission No.</th>
                  <th className="px-6 py-4 text-right">Score</th>
                  <th className="px-6 py-4 text-center">System Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedResults.map((result) => {
                  const isExemptOrAbsent = result.isAbsent || result.isExempted;
                  const studentName = result.studentProfile
                    ? `${result.studentProfile.user.firstName} ${result.studentProfile.user.lastName}`
                    : result.student
                      ? `${result.student.firstName} ${result.student.lastName}`
                      : "Unknown Student";

                  const admissionNo =
                    result.studentProfile?.admissionNumber ||
                    result.student?.admissionNumber ||
                    "Pending";

                  return (
                    <tr
                      key={result.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {studentName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-500">
                          {admissionNo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isExemptOrAbsent ? (
                          <span className="text-xs font-bold text-slate-400 uppercase">
                            {result.isAbsent ? "Absent" : "Exempt"}
                          </span>
                        ) : (
                          <span
                            className={`text-lg font-black ${result.passed ? "text-slate-900" : "text-rose-600"}`}
                          >
                            {result.marks}{" "}
                            <span className="text-[10px] text-slate-400 font-bold">
                              / {maxMarksString}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isExemptOrAbsent ? (
                          <span className="text-slate-300">-</span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                              result.passed
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : "bg-rose-50 text-rose-700 border-rose-100"
                            }`}
                          >
                            {result.passed ? "PASS" : "FAIL"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
