import { redirect } from "next/navigation";
import {
  GraduationCap,
  CalendarDays,
  BellRing,
  BookOpen,
  ChevronRight,
  Clock,
} from "lucide-react";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const session = await auth();

  // 1. Authentication & Security Gate
  if (!session?.user?.id) {
    redirect("/login");
  }

  const role = (session.user.role || "").toUpperCase();
  if (role !== "STUDENT") {
    redirect("/unauthorized");
  }

  // 2. Fetch Student Profile & Cohort Data
  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      intake: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!studentProfile) {
    return (
      <div className="p-6 text-center bg-amber-50 rounded-2xl border border-amber-200 mt-10 max-w-xl mx-auto">
        <h2 className="text-lg font-bold text-amber-800">Profile Incomplete</h2>
        <p className="text-sm text-amber-700 mt-1">
          Your student profile is currently pending activation by the ICT
          department.
        </p>
      </div>
    );
  }

  // 3. Fetch Unread Notifications
  const unreadNotifications = await prisma.notification.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { student: { email: session.user.email! } },
      ],
      isRead: false,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      sender: { select: { firstName: true, lastName: true } },
    },
  });

  // 4. Fetch Today's Timetable
  const todayClasses = await prisma.timetableEntry.findMany({
    where: {
      intakeId: studentProfile.intakeId,
      isActive: true,
    },
    take: 4,
    include: {
      lecturer: { select: { firstName: true, lastName: true } },
      unitAssignment: {
        include: { unit: { select: { title: true, code: true } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {/* --- SLIMMED DOWN HERO BANNER --- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-6 sm:px-8 sm:py-8 text-white shadow-md border border-slate-800">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-sky-500/15 blur-[80px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <GraduationCap className="h-4 w-4 text-sky-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">
                IMTR Student Portal
              </p>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Welcome back, {session.user.firstName}.
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <BookOpen className="h-3 w-3 text-emerald-400" />
              <span className="truncate max-w-[150px] sm:max-w-xs">
                {studentProfile.intake.course.title}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
              <span className="text-slate-400">Admission No:</span>
              <span className="font-bold text-white">
                {studentProfile.admissionNumber}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* --- TWO-COLUMN DASHBOARD --- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT COLUMN: Main Content (Timetable) */}
        <section className="lg:col-span-2 space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-500" />
              Today's Schedule
            </h2>
            <Link
              href="/student/timetable"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Full Timetable <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {todayClasses.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                <p className="text-sm text-slate-500 font-medium">
                  No classes scheduled for today.
                </p>
              </div>
            ) : (
              todayClasses.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-[120px]">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Period
                      </p>
                      <p className="text-sm font-black text-slate-800">
                        {session.startPeriod} - {session.endPeriod}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 border-l border-slate-100 pl-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      {session.unitAssignment.unit.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                      <p>
                        Lecturer:{" "}
                        <span className="font-semibold text-slate-700">
                          {session.lecturer.firstName}{" "}
                          {session.lecturer.lastName}
                        </span>
                      </p>
                      {session.room && (
                        <p>
                          Room:{" "}
                          <span className="font-semibold text-slate-700">
                            {session.room}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Notifications & Quick Alerts */}
        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BellRing className="h-5 w-5 text-rose-500" />
              Inbox
            </h2>
            <Link
              href="/student/notifications"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1">
            {unreadNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-slate-500 font-medium text-xs">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {unreadNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[13px] font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                          {notification.title}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                          From: {notification.sender?.firstName}{" "}
                          {notification.sender?.lastName}
                        </p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
