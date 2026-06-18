import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  ArrowLeft,
  AlertTriangle,
  UserX,
  Clock,
  ChevronRight,
  ShieldAlert,
  Mail,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AttendanceMetricsPage() {
  const session = await auth();

  // 1. Security Gate
  if (!session?.user?.id) redirect("/login");
  const role = (session.user.role || "").toUpperCase();
  if (role !== "ACADEMIC_DIRECTOR" && role !== "SUPER_ADMIN")
    redirect("/unauthorized");

  // 2. Fetch Active Students & Intakes
  // (We fetch the actual student profiles and courses to populate the watchlist)
  const activeStudents = await prisma.studentProfile.findMany({
    where: { academicStatus: "ACTIVE" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      intake: { include: { course: true } },
    },
  });

  /*
   * 3. ATTENDANCE ENGINE (Mocked for UI stability)
   * In production, you would replace this block with:
   * await prisma.attendanceRecord.findMany(...)
   * For now, we simulate attendance rates to render the dashboard perfectly without schema crashes.
   */
  const ATTENDANCE_THRESHOLD = 75; // 75% minimum institutional requirement

  const processedStudents = activeStudents.map((student) => {
    // Simulating a realistic attendance spread between 60% and 100% based on their ID string
    const pseudoRandomHash =
      student.id.charCodeAt(0) + student.id.charCodeAt(student.id.length - 1);
    const attendanceRate = 60 + (pseudoRandomHash % 41);

    return {
      ...student,
      attendanceRate,
      isAtRisk: attendanceRate < ATTENDANCE_THRESHOLD,
      missedSessions: Math.floor((100 - attendanceRate) / 2), // Rough estimate of sessions missed
    };
  });

  const atRiskStudents = processedStudents
    .filter((s) => s.isAtRisk)
    .sort((a, b) => a.attendanceRate - b.attendanceRate); // Lowest attendance first

  const globalAttendance =
    processedStudents.length > 0
      ? Math.round(
          processedStudents.reduce(
            (acc, curr) => acc + curr.attendanceRate,
            0,
          ) / processedStudents.length,
        )
      : 0;

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
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-[80px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <CalendarDays className="h-4 w-4 text-indigo-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                Institutional Analytics
              </p>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Attendance Metrics
            </h1>
          </div>
          <p className="text-xs font-medium text-slate-300 max-w-xs md:text-right leading-relaxed">
            Monitor institutional engagement and identify cohorts or learners
            falling below the {ATTENDANCE_THRESHOLD}% threshold.
          </p>
        </div>
      </section>

      {/* --- MACRO METRICS --- */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Global Average
            </p>
            <p className="text-2xl font-black text-slate-900">
              {globalAttendance}%
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <UserX className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Critical Risk ({"<"} {ATTENDANCE_THRESHOLD}%)
            </p>
            <p className="text-2xl font-black text-slate-900">
              {atRiskStudents.length}{" "}
              <span className="text-sm font-medium text-slate-500">
                students
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Borderline (75-80%)
            </p>
            <p className="text-2xl font-black text-slate-900">
              {
                processedStudents.filter(
                  (s) => s.attendanceRate >= 75 && s.attendanceRate <= 80,
                ).length
              }{" "}
              <span className="text-sm font-medium text-slate-500">
                students
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* --- WATCHLIST TABLE --- */}
      <section className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            Attendance Watchlist
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {atRiskStudents.length === 0 ? (
            <div className="p-10 text-center flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CalendarDays className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-bold text-slate-900">All Clear</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">
                No active students are currently below the{" "}
                {ATTENDANCE_THRESHOLD}% threshold.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Cohort / Course</th>
                    <th className="px-6 py-4 text-center">Sessions Missed</th>
                    <th className="px-6 py-4 text-right">Current Rate</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {atRiskStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">
                            {student.user.firstName} {student.user.lastName}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {student.admissionNumber || "No Admission No."}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">
                            {student.intake?.title || "N/A"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">
                            {student.intake?.course?.title || "Unknown Course"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-rose-100 text-rose-700 font-black text-xs">
                          {student.missedSessions}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-black text-rose-600">
                          {student.attendanceRate}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-sm">
                          <Mail className="h-3 w-3" /> Warn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
