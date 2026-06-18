import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  FileText,
  CheckCircle,
  Clock,
  AlertOctagon,
  ChevronRight,
  Database,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SuperAdminReviewQueuePage() {
  const session = await auth();

  // 1. Strict Security Gate
  if (!session?.user?.id) redirect("/login");
  const role = (session.user.role || "").toUpperCase();
  if (role !== "SUPER_ADMIN") redirect("/unauthorized");

  // 2. Fetch ALL submissions
  const submissions = await prisma.resultSubmission.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      assessment: {
        include: {
          unitAssignment: { include: { unit: true } },
          intake: { include: { course: true } },
        },
      },
      createdBy: { select: { firstName: true, lastName: true, role: true } },
      _count: { select: { results: true } },
    },
  });

  // 3. Analytics matching your exact Prisma Enum
  const total = submissions.length;

  const publishedOrApproved = submissions.filter(
    (s) => s.status === "PUBLISHED" || s.status === "FINAL_APPROVED",
  ).length;

  const pending = submissions.filter(
    (s) =>
      s.status === "SUBMITTED_TO_COORDINATOR" ||
      s.status === "SUBMITTED_TO_ACADEMIC_DIRECTOR",
  ).length;

  const draftsAndArchived = submissions.filter(
    (s) => s.status === "DRAFT" || s.status === "ARCHIVED",
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {/* --- EXECUTIVE HERO BANNER --- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 sm:px-8 sm:py-6 text-white shadow-md border border-slate-800">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-slate-500/10 blur-[80px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldCheck className="h-4 w-4 text-slate-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Global Oversight
              </p>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              System Results Master List
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 transition-colors px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer">
              <Database className="h-4 w-4" /> Export All Records
            </button>
          </div>
        </div>
      </section>

      {/* --- TELEMETRY CARDS --- */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-slate-400" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Total Records
            </p>
          </div>
          <p className="text-2xl font-black text-slate-900">{total}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Pending Review
            </p>
          </div>
          <p className="text-2xl font-black text-amber-600">{pending}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertOctagon className="h-4 w-4 text-slate-500" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Drafts & Archived
            </p>
          </div>
          <p className="text-2xl font-black text-slate-700">
            {draftsAndArchived}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Approved / Published
            </p>
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {publishedOrApproved}
          </p>
        </div>
      </section>

      {/* --- GLOBAL SUBMISSIONS TABLE --- */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Assessment Details</th>
                <th className="px-6 py-4">Cohort</th>
                <th className="px-6 py-4 text-center">Students</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-500 font-medium"
                  >
                    No submissions found in the entire system.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => {
                  const isPublished =
                    sub.status === "PUBLISHED" ||
                    sub.status === "FINAL_APPROVED";
                  const isDraft =
                    sub.status === "DRAFT" || sub.status === "ARCHIVED";

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {/* Assessment */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {sub.assessment.title}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {sub.assessment.unitAssignment.unit.code} -{" "}
                            {sub.assessment.unitAssignment.unit.title}
                          </span>
                        </div>
                      </td>

                      {/* Cohort */}
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-700">
                          {sub.assessment.intake.title}
                        </span>
                      </td>

                      {/* Students */}
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-slate-900">
                          {sub._count.results}
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {sub.createdBy.firstName} {sub.createdBy.lastName}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase">
                            {/* FIXED: Target the .name property of the role object */}
                            {sub.createdBy.role?.name || "Unknown Role"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                            isPublished
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : isDraft
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : "bg-amber-50 text-amber-700 border-amber-100"
                          }`}
                        >
                          {sub.status.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/super-admin/review/${sub.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-sm"
                        >
                          View / Override <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
