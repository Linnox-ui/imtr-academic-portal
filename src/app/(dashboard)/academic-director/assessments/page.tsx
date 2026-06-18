import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  ClipboardSignature,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldAlert,
  Search,
  BookOpen,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AcademicDirectorAssessmentsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user.role || "").toUpperCase();
  if (role !== "ACADEMIC_DIRECTOR" && role !== "SUPER_ADMIN") {
    redirect("/unauthorized");
  }

  const [pendingDirectorCount, publishedCount, draftCount] = await Promise.all([
    prisma.resultSubmission.count({
      where: { status: "SUBMITTED_TO_ACADEMIC_DIRECTOR" },
    }),
    prisma.resultSubmission.count({
      where: { status: "PUBLISHED" },
    }),
    prisma.resultSubmission.count({
      where: { status: "DRAFT" },
    }),
  ]);

  const pendingApprovals = await prisma.resultSubmission.findMany({
    where: { status: "SUBMITTED_TO_ACADEMIC_DIRECTOR" },
    orderBy: { updatedAt: "desc" },
    include: {
      assessment: {
        include: {
          unitAssignment: {
            include: { unit: { select: { title: true, code: true } } },
          },
          intake: {
            select: { title: true, course: { select: { title: true } } },
          },
        },
      },
    },
    take: 10,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 sm:px-8 sm:py-6 text-white shadow-md border border-slate-800">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-[80px]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <ClipboardSignature className="h-4 w-4 text-emerald-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                Academic Standards Command
              </p>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Assessment Authorization
            </h1>
          </div>
          <p className="text-xs font-medium text-slate-300 max-w-xs md:text-right leading-relaxed">
            Audit institutional pipelines, authorize cohort results, and monitor
            quality control.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Requires Approval
            </p>
            <p className="text-xl font-black text-slate-900">
              {pendingDirectorCount}{" "}
              <span className="text-xs font-medium text-slate-500">
                batches
              </span>
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              In Pipeline
            </p>
            <p className="text-xl font-black text-slate-900">
              {draftCount}{" "}
              <span className="text-xs font-medium text-slate-500">drafts</span>
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Published Live
            </p>
            <p className="text-xl font-black text-slate-900">
              {publishedCount}{" "}
              <span className="text-xs font-medium text-slate-500">
                cohorts
              </span>
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <ClipboardSignature className="h-5 w-5 text-indigo-500" />{" "}
              Authorization Queue
            </h2>
          </div>

          <div className="space-y-3">
            {pendingApprovals.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <p className="text-sm text-slate-500 font-medium">
                  The authorization queue is clear.
                </p>
              </div>
            ) : (
              pendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-rose-500 uppercase tracking-wider mb-0.5">
                        Action Required
                      </p>
                      <p className="text-xs font-black text-slate-900">
                        {approval.assessment.unitAssignment.unit.code}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 border-l border-slate-100 pl-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      {approval.assessment.unitAssignment.unit.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5 text-xs text-slate-500">
                      <p>
                        <span className="font-semibold text-slate-700">
                          {approval.assessment.intake.course.title}
                        </span>
                      </p>
                      <p>
                        Cohort:{" "}
                        <span className="font-semibold text-slate-700">
                          {approval.assessment.intake.title}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Explicitly mapping the ID to the URL */}
                  <Link
                    href={`/academic-director/assessments/review?submissionId=${approval.id}`}
                    className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl transition-colors text-xs"
                  >
                    Review <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> QC Flags
            </h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5">
            <div className="space-y-0.5">
              <div className="p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors line-clamp-1">
                      High Failure Rate
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      Meteorology 101 currently shows a 34% failure rate in
                      pending results.
                    </p>
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-rose-600 shrink-0 mt-0.5">
                    <BarChart3 className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
