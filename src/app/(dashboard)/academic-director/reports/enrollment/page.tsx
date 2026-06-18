import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  GraduationCap,
  TrendingUp,
  CalendarDays,
  PieChart,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EnrollmentReportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user.role || "").toUpperCase();
  if (role !== "ACADEMIC_DIRECTOR" && role !== "SUPER_ADMIN")
    redirect("/unauthorized");

  // Fetch all active intakes with student counts and course info
  const intakes = await prisma.intake.findMany({
    where: { status: "ACTIVE" },
    include: {
      course: { select: { title: true, code: true } },
      _count: { select: { students: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalEnrollment = intakes.reduce(
    (acc, curr) => acc + curr._count.students,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex items-center gap-2">
        <Link
          href="/academic-director/reports"
          className="text-sm font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Analytics
        </Link>
      </div>

      {/* Hero Header */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Cohort Enrollment Analysis
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Real-time enrollment status across all active academic intakes.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
            Total Active Learners
          </p>
          <p className="text-3xl font-black text-indigo-600">
            {totalEnrollment}
          </p>
        </div>
      </section>

      {/* Detailed Data Table */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">
                Cohort Code
              </th>
              <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px]">
                Program
              </th>
              <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] text-right">
                Enrollment
              </th>
              <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {intakes.map((intake) => (
              <tr
                key={intake.id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-6 py-4 font-bold text-slate-900">
                  {intake.code}
                </td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-900">
                    {intake.course.title}
                  </p>
                  <p className="text-xs text-slate-500">{intake.title}</p>
                </td>
                <td className="px-6 py-4 text-right font-black text-slate-900">
                  {intake._count.students}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
