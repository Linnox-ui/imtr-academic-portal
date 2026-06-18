import { redirect } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  ArrowLeft,
  Target,
  Award,
  AlertTriangle,
  BarChart3,
  BookOpenText,
  ChevronRight,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AcademicPerformanceReportPage() {
  const session = await auth();

  // 1. Security Gate
  if (!session?.user?.id) redirect("/login");
  const role = (session.user.role || "").toUpperCase();
  if (role !== "ACADEMIC_DIRECTOR" && role !== "SUPER_ADMIN")
    redirect("/unauthorized");

  // 2. Fetch all PUBLISHED results to calculate real performance metrics
  // In a massive production database, you would use Prisma's aggregate functions,
  // but for exact grade threshold math (pass/fail), fetching the structured data is safer here.
  const publishedSubmissions = await prisma.resultSubmission.findMany({
    where: { status: "PUBLISHED" },
    include: {
      assessment: {
        include: {
          unitAssignment: { include: { unit: true } },
          intake: { include: { course: true } },
        },
      },
      results: true,
    },
  });

  // 3. Number Crunching (The Analytics Engine)
  let totalGrades = 0;
  let totalPasses = 0;
  let cumulativeScore = 0;
  let validScoreCount = 0;

  // We will map out unit performance to find the best and worst
  const unitPerformance = new Map<
    string,
    {
      title: string;
      code: string;
      course: string;
      total: number;
      passes: number;
      sum: number;
      count: number;
    }
  >();

  publishedSubmissions.forEach((sub) => {
    const passThreshold = Number(sub.assessment.maxMarks) / 2;
    const unitId = sub.assessment.unitAssignment.unit.id;

    if (!unitPerformance.has(unitId)) {
      unitPerformance.set(unitId, {
        title: sub.assessment.unitAssignment.unit.title,
        code: sub.assessment.unitAssignment.unit.code,
        course: sub.assessment.intake.course.title,
        total: 0,
        passes: 0,
        sum: 0,
        count: 0,
      });
    }
    const unitData = unitPerformance.get(unitId)!;

    sub.results.forEach((result) => {
      totalGrades++;
      unitData.total++;

      if (!result.isAbsent && !result.isExempted && result.marks) {
        const marks = Number(result.marks);
        cumulativeScore += marks;
        validScoreCount++;
        unitData.sum += marks;
        unitData.count++;

        if (marks >= passThreshold) {
          totalPasses++;
          unitData.passes++;
        }
      }
    });
  });

  // Global Metrics
  const globalPassRate =
    totalGrades > 0 ? Math.round((totalPasses / totalGrades) * 100) : 0;
  const globalAverage =
    validScoreCount > 0
      ? (cumulativeScore / validScoreCount).toFixed(1)
      : "0.0";

  // Sort units to find outliers
  const sortedUnits = Array.from(unitPerformance.values())
    .map((u) => ({
      ...u,
      passRate: u.total > 0 ? (u.passes / u.total) * 100 : 0,
    }))
    .sort((a, b) => b.passRate - a.passRate); // Highest pass rate first

  const topPerforming = sortedUnits.slice(0, 3);
  const lowestPerforming = [...sortedUnits]
    .reverse()
    .slice(0, 3)
    .filter((u) => u.total > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {/* --- TOP NAVIGATION --- */}
      <div className="flex items-center gap-2">
        <Link
          href="/academic-director/reports"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Analytics
        </Link>
      </div>

      {/* --- SLIM HERO BANNER --- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 sm:px-8 sm:py-6 text-white shadow-md border border-slate-800">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-sky-500/15 blur-[80px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className="h-4 w-4 text-sky-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">
                Institutional Analytics
              </p>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Academic Performance
            </h1>
          </div>
          <p className="text-xs font-medium text-slate-300 max-w-xs md:text-right leading-relaxed">
            Aggregated grading data based strictly on published results across
            all active cohorts.
          </p>
        </div>
      </section>

      {/* --- MACRO METRICS --- */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition-transform group-hover:scale-105">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Global Pass Rate
              </p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-slate-900">
                  {globalPassRate}%
                </p>
              </div>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-500">Based on</p>
            <p className="text-sm font-black text-slate-900">
              {totalGrades}{" "}
              <span className="text-slate-400 font-medium">assessments</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm flex items-center justify-between group">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-105">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                Institution Average
              </p>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-slate-900">
                  {globalAverage}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PERFORMANCE OUTLIERS --- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Performing Units */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-500" />
              Highest Pass Rates
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5">
            <div className="space-y-0.5">
              {topPerforming.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-medium text-sm">
                  No data available yet.
                </div>
              ) : (
                topPerforming.map((unit, index) => (
                  <div
                    key={unit.code}
                    className="p-4 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs shrink-0 border border-emerald-100">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-tight">
                          {unit.title}
                        </h3>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">
                          {unit.course}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-emerald-600">
                        {Math.round(unit.passRate)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Needs Attention */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Requires Attention
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5">
            <div className="space-y-0.5">
              {lowestPerforming.length === 0 ? (
                <div className="p-6 text-center text-slate-500 font-medium text-sm">
                  No failing data available.
                </div>
              ) : (
                lowestPerforming.map((unit) => (
                  <div
                    key={unit.code}
                    className="p-4 hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-100 group-hover:scale-105 transition-transform">
                        <BookOpenText className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm leading-tight">
                          {unit.title}
                        </h3>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5 uppercase tracking-wide">
                          {unit.course}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                        Pass Rate
                      </p>
                      <p className="text-base font-black text-rose-600 leading-none">
                        {Math.round(unit.passRate)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
