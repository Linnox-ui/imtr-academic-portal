import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Users,
  AlertTriangle,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishResults, rejectToCoordinator } from "./actions";

export const dynamic = "force-dynamic";

// THE FIX: Properly type searchParams to handle Next.js 15 Promises
export default async function AssessmentReviewPage(props: {
  searchParams:
    | Promise<{ [key: string]: string | undefined }>
    | { [key: string]: string | undefined };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user.role || "").toUpperCase();
  if (role !== "ACADEMIC_DIRECTOR" && role !== "SUPER_ADMIN")
    redirect("/unauthorized");

  // THE FIX: Safely await the search params
  const resolvedSearchParams = await props.searchParams;
  const submissionId = resolvedSearchParams?.submissionId;

  // VISUAL ERROR: Instead of silently redirecting, tell the user what went wrong
  if (!submissionId) {
    return (
      <div className="mx-auto max-w-2xl mt-20 text-center space-y-4 bg-white p-10 rounded-3xl border border-rose-100 shadow-sm">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
        <h1 className="text-xl font-black text-slate-900">
          Missing Submission ID
        </h1>
        <p className="text-slate-500 font-medium">
          The URL is missing the required batch identifier. Please go back to
          the queue and click 'Review' again.
        </p>
        <Link
          href="/academic-director/assessments"
          className="inline-block mt-4 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
        >
          Return to Queue
        </Link>
      </div>
    );
  }

  // Fetch the batch
  const submission = await prisma.resultSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assessment: {
        include: {
          unitAssignment: { include: { unit: true } },
          intake: { include: { course: true } },
        },
      },
      createdBy: { select: { firstName: true, lastName: true } },
      coordinatorReviewedBy: { select: { firstName: true, lastName: true } },
      results: {
        include: {
          student: true,
          studentProfile: { include: { user: true } },
        },
        // THE FIX: Switched to sorting by creation date. Sorting by a nullable relation (student) can sometimes cause Prisma to crash silently.
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // VISUAL ERROR: If the ID exists in the URL but not in the database
  if (!submission) {
    return (
      <div className="mx-auto max-w-2xl mt-20 text-center space-y-4 bg-white p-10 rounded-3xl border border-rose-100 shadow-sm">
        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto" />
        <h1 className="text-xl font-black text-slate-900">Batch Not Found</h1>
        <p className="text-slate-500 font-medium">
          The requested result submission could not be found in the database. It
          may have been deleted or already processed.
        </p>
        <Link
          href="/academic-director/assessments"
          className="inline-block mt-4 px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
        >
          Return to Queue
        </Link>
      </div>
    );
  }

  const isPending = submission.status === "SUBMITTED_TO_ACADEMIC_DIRECTOR";
  const passThreshold = Number(submission.assessment.maxMarks) / 2;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex items-center gap-2">
        <Link
          href="/academic-director/assessments"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Queue
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${isPending ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}
            >
              {submission.status.replace(/_/g, " ")}
            </span>
            <span className="text-xs font-bold text-slate-400">
              ID: {submission.id.slice(-8).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {submission.assessment.unitAssignment.unit.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500 mt-2">
            <p className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" /> {submission.assessment.code}
            </p>
            <p className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />{" "}
              {submission.assessment.intake.course.title}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:text-right border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Lecturer
            </p>
            <p className="text-sm font-bold text-slate-900">
              {submission.createdBy.firstName} {submission.createdBy.lastName}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Coordinator
            </p>
            <p className="text-sm font-bold text-slate-900">
              {submission.coordinatorReviewedBy?.firstName || "N/A"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="font-bold text-slate-900">Student Grade Roster</h2>
            <p className="text-xs font-semibold text-slate-500">
              Max Marks: {submission.assessment.maxMarks.toString()}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider bg-white">
                  <th className="px-6 py-3">Admission No.</th>
                  <th className="px-6 py-3 text-right">Marks</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {submission.results.map((result) => {
                  const admissionNo =
                    result.student?.admissionNumber ||
                    result.studentProfile?.admissionNumber ||
                    "N/A";
                  const marks = result.marks ? Number(result.marks) : 0;
                  const isFail = marks < passThreshold;

                  return (
                    <tr
                      key={result.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-3 font-semibold text-slate-600">
                        {admissionNo}
                      </td>
                      <td className="px-6 py-3 text-right font-black text-slate-900">
                        {result.isAbsent
                          ? "ABS"
                          : result.isExempted
                            ? "EXM"
                            : marks}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {result.isAbsent || result.isExempted ? (
                          <span className="text-xs font-bold text-slate-400">
                            -
                          </span>
                        ) : isFail ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md uppercase">
                            Fail
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                            Pass
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

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-bold text-slate-900 mb-4">Director Actions</h3>

            {isPending ? (
              <div className="space-y-3">
                <form action={publishResults}>
                  <input
                    type="hidden"
                    name="submissionId"
                    value={submission.id}
                  />
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors shadow-sm text-sm cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve & Publish
                  </button>
                </form>

                <form action={rejectToCoordinator}>
                  <input
                    type="hidden"
                    name="submissionId"
                    value={submission.id}
                  />
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold py-2.5 px-4 rounded-xl transition-colors text-sm cursor-pointer"
                  >
                    <XCircle className="h-4 w-4" /> Reject to Coordinator
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-900">
                  Action Complete
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
