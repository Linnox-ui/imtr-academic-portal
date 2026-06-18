import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  GraduationCap,
  CalendarDays,
  ChevronRight,
  LineChart,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// IMPORT YOUR NEW CLIENT COMPONENT HERE
// Make sure the path matches where you saved the file!
import { ExportButton } from "@/components/ExportButton";

export const dynamic = "force-dynamic";

export default async function AcademicReportsPage() {
  const session = await auth();

  // 1. Security Gate
  if (!session?.user?.id) redirect("/login");

  const role = (session.user.role || "").toUpperCase();
  if (role !== "ACADEMIC_DIRECTOR" && role !== "SUPER_ADMIN")
    redirect("/unauthorized");

  // 2. Fetch Institutional Aggregates
  const [totalStudents, totalCourses, publishedSubmissions] = await Promise.all(
    [
      prisma.studentProfile.count({ where: { academicStatus: "ACTIVE" } }),
      prisma.trainingCourse.count(),
      prisma.resultSubmission.count({ where: { status: "PUBLISHED" } }),
    ],
  );

  // 3. Fetch Intake Enrollment Stats
  const activeIntakes = await prisma.intake.findMany({
    where: { status: "ACTIVE" },
    include: {
      course: { select: { title: true, code: true } },
      _count: { select: { students: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {/* --- SLIM HERO BANNER --- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 sm:px-8 sm:py-6 text-white shadow-md border border-slate-800">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-sky-500/15 blur-[80px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <BarChart3 className="h-4 w-4 text-sky-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">
                Institutional Analytics
              </p>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Reports & Dashboards
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* THE FIX: Use the interactive Client Component here */}
            <ExportButton />
          </div>
        </div>
      </section>

      {/* --- SLIM TELEMETRY --- */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Active Enrollment
            </p>
            <p className="text-xl font-black text-slate-900">
              {totalStudents}{" "}
              <span className="text-xs font-medium text-slate-500">
                learners
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Active Courses
            </p>
            <p className="text-xl font-black text-slate-900">
              {totalCourses}{" "}
              <span className="text-xs font-medium text-slate-500">
                programs
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Published Results
            </p>
            <p className="text-xl font-black text-slate-900">
              {publishedSubmissions}{" "}
              <span className="text-xs font-medium text-slate-500">
                batches
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* --- TWO COLUMN LAYOUT: ENROLLMENT & PERFORMANCE --- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: Active Intakes (Enrollment Data) */}
        <section className="lg:col-span-2 space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-500" />
              Current Cohort Enrollment
            </h2>
            <Link
              href="/academic-director/reports/enrollment"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Full Report <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {activeIntakes.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-500 font-medium">
                    No active intakes found.
                  </p>
                </div>
              ) : (
                activeIntakes.map((intake) => (
                  <div
                    key={intake.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 shrink-0">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-black text-slate-900">
                            {intake.code}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-wider">
                            Active
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 truncate max-w-[200px] sm:max-w-md">
                          {intake.course.title}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Students
                        </p>
                        <p className="text-sm font-black text-slate-900">
                          {intake._count.students}
                        </p>
                      </div>
                      <Link
                        href={`/academic-director/reports/intake/${intake.id}`}
                        className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Quick Links & Actions */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <LineChart className="h-5 w-5 text-sky-500" />
              Report Modules
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2">
            <div className="space-y-1">
              <Link
                href="/academic-director/reports/performance"
                className="block p-3 hover:bg-slate-50 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs group-hover:text-sky-600 transition-colors">
                      Academic Performance
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Pass rates and grade distributions.
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href="/academic-director/reports/attendance"
                className="block p-3 hover:bg-slate-50 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs group-hover:text-indigo-600 transition-colors">
                      Attendance Metrics
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Institutional attendance thresholds.
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
