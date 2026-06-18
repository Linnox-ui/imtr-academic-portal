import type { ElementType } from "react";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ClipboardCheck,
  Database,
  GraduationCap,
  Info,
  Layers3,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  AlertTriangle,
} from "lucide-react";

import { ResultWorkflowStatus, UnitAssignmentStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Tone = "sky" | "indigo" | "emerald" | "amber" | "rose";

const TONE_STYLES: Record<Tone, string> = {
  sky: "bg-sky-50 text-sky-600 border-sky-100",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-all";

export default async function SuperAdminDashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      createdAt: true,
      role: { select: { name: true } },
    },
  });

  if (
    !currentUser ||
    !currentUser.isActive ||
    currentUser.role.name !== "super_admin"
  ) {
    redirect("/unauthorized");
  }

  const [
    totalUsers,
    activeUsers,
    totalRoles,
    totalCourses,
    totalIntakes,
    totalStudents,
    totalUnits,
    activeLecturerAllocations,
    submittedUnitAssignments,
    coordinatorResultQueue,
    academicResultQueue,
    publishedResultSheets,
    roles,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.role.count(),
    prisma.trainingCourse.count(),
    prisma.intake.count(),
    prisma.studentProfile.count(),
    prisma.courseUnit.count(),
    prisma.lecturerUnitAllocation.count({ where: { isActive: true } }),
    prisma.semesterUnitAssignment.count({
      where: { status: UnitAssignmentStatus.SUBMITTED },
    }),
    prisma.resultSubmission.count({
      where: {
        status: {
          in: [
            ResultWorkflowStatus.SUBMITTED_TO_COORDINATOR,
            ResultWorkflowStatus.RETURNED_TO_COORDINATOR,
          ],
        },
      },
    }),
    prisma.resultSubmission.count({
      where: { status: ResultWorkflowStatus.SUBMITTED_TO_ACADEMIC_DIRECTOR },
    }),
    prisma.resultSubmission.count({
      where: { status: ResultWorkflowStatus.PUBLISHED },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { users: true } },
      },
    }),
    prisma.user.findMany({
      take: 7,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        requiresPasswordChange: true,
        createdAt: true,
        role: { select: { name: true } },
      },
    }),
  ]);

  const inactiveUsers = Math.max(totalUsers - activeUsers, 0);
  const totalPendingAcademicActions =
    submittedUnitAssignments + coordinatorResultQueue + academicResultQueue;
  const activeUserPercentage =
    totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
  const largestRoleCount = Math.max(
    ...roles.map((role) => role._count.users),
    1,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {/* --- EXECUTIVE HERO BANNER --- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[80px]" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="absolute right-10 top-10 h-64 w-64 rounded-full border border-white/5" />

        <div className="relative flex flex-col gap-6 p-6 sm:p-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-5">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2 shadow-lg backdrop-blur-sm">
              <Image
                src="/images/gok-logo.png"
                alt="Republic of Kenya coat of arms"
                fill
                sizes="64px"
                className="object-contain p-1"
                priority
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles
                  className="h-4 w-4 text-indigo-400"
                  aria-hidden="true"
                />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                  Super Administrator Control Centre
                </p>
              </div>

              <h1 className="break-words text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                System Administration
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
                Welcome, {currentUser.firstName}. Monitor users, academic
                structures, teaching allocations, approvals and system activity
                across the IMTR Academic Portal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <HeroStat label="Users" value={totalUsers} />
            <HeroStat label="Courses" value={totalCourses} />
            <HeroStat label="Pending" value={totalPendingAcademicActions} />
          </div>
        </div>

        <div className="relative grid border-t border-slate-800 bg-slate-900/50 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
          <HeroDetail
            label="Signed-in Administrator"
            value={`${currentUser.firstName} ${currentUser.lastName}`}
          />
          <HeroDetail label="Account Role" value="Super Administrator" />
          <HeroDetail label="System Status" value="Database Connected" />
        </div>
      </section>

      {/* --- INFO ALERT --- */}
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 px-5 py-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600"
          aria-hidden="true"
        />
        <p className="text-xs font-bold leading-5 text-indigo-900">
          Figures below are read live from the portal database on every page
          load and reflect current institutional state, not a cached or
          historical snapshot.
        </p>
      </div>

      {/* --- TELEMETRY CARDS --- */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
        <MetricCard
          icon={Users}
          label="Portal Users"
          value={`${totalUsers}`}
          helper={`${activeUsers} active accounts`}
          tone="sky"
        />
        <MetricCard
          icon={GraduationCap}
          label="Enrolled Students"
          value={`${totalStudents}`}
          helper={`${totalIntakes} active or historical intakes`}
          tone="emerald"
        />
        <MetricCard
          icon={BookOpen}
          label="Training Courses"
          value={`${totalCourses}`}
          helper={`${totalUnits} registered course units`}
          tone="indigo"
        />
        <MetricCard
          icon={Activity}
          label="Active Allocations"
          value={`${activeLecturerAllocations}`}
          helper="Current lecturer-unit assignments"
          tone="amber"
        />
      </section>

      {/* --- MAIN BODY --- */}
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
        {/* Academic Action Queue */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Academic Action Queue
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Items currently waiting for authorised review or approval.
                </p>
              </div>
            </div>

            <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700 shadow-sm">
              {totalPendingAcademicActions} Pending
            </span>
          </div>

          <div className="flex-1 grid gap-4 p-5 bg-slate-50/30">
            <QueueCard
              icon={Layers3}
              title="Semester Unit Approvals"
              description="Course-unit structures submitted by coordinators."
              count={submittedUnitAssignments}
              href="/academic-director/unit-approvals"
              linkLabel="Open Unit Approvals"
              tone="sky"
            />
            <QueueCard
              icon={UserCheck}
              title="Coordinator Result Reviews"
              description="Result sheets awaiting coordinator review or returned by the Academic Director."
              count={coordinatorResultQueue}
              href="/coordinator/results-review"
              linkLabel="View Coordinator Queue"
              tone="amber"
            />
            <QueueCard
              icon={BadgeCheck}
              title="Final Results Review"
              description="Coordinator-approved result sheets awaiting final academic approval."
              count={academicResultQueue}
              href="/academic-director/results-review"
              linkLabel="Open Final Review"
              tone="indigo"
            />
          </div>
        </section>

        {/* System Overview */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="border-b border-slate-100 bg-slate-50/50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Database className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  System Overview
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Current portal account and academic database summary.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-5 p-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Active Accounts
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-900">
                    {activeUserPercentage}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-emerald-600">
                    {activeUsers} Active
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {inactiveUsers} inactive
                  </p>
                </div>
              </div>

              <div
                className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={activeUserPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Active account percentage"
              >
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${activeUserPercentage}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <MiniMetric label="System Roles" value={`${totalRoles}`} />
              <MiniMetric label="Intakes" value={`${totalIntakes}`} />
              <MiniMetric label="Course Units" value={`${totalUnits}`} />
              <MiniMetric
                label="Published Sheets"
                value={`${publishedResultSheets}`}
              />
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-black text-emerald-900">
                    Core database services available
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-emerald-700">
                    Dashboard statistics were loaded successfully from the
                    portal database.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
        {/* Role Distribution */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="border-b border-slate-100 bg-slate-50/50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Role Distribution
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Number of accounts assigned to each portal role.
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-5 p-5">
            {roles.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="No roles configured"
                description="Create at least one role before assigning user accounts."
                actionHref="/super-admin/roles"
                actionLabel="Manage Roles"
              />
            ) : (
              roles.map((role) => {
                const percentage =
                  totalUsers > 0
                    ? Math.round((role._count.users / totalUsers) * 100)
                    : 0;
                const relativeWidth = Math.max(
                  Math.round((role._count.users / largestRoleCount) * 100),
                  role._count.users > 0 ? 6 : 0,
                );

                return (
                  <article key={role.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                          {formatEnum(role.name)}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {role.description || "Portal access role"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-black text-slate-900">
                          {role._count.users}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500">
                          {percentage}%
                        </p>
                      </div>
                    </div>

                    <div
                      className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-valuenow={percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${formatEnum(role.name)} share of total users`}
                    >
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${relativeWidth}%` }}
                      />
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        {/* Recently Created Accounts */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Recent Accounts
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Latest users added to the portal.
                </p>
              </div>
            </div>

            <Link
              href="/super-admin/users"
              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
            >
              Manage Users
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex-1 flex flex-col">
            {recentUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No user accounts found"
                description="Create the first portal account to get started."
                actionHref="/super-admin/users"
                actionLabel="Add a User"
              />
            ) : (
              <div className="divide-y divide-slate-100 flex-1">
                {recentUsers.map((user) => (
                  <article
                    key={user.id}
                    className="flex min-w-0 items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/50"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-600">
                      {getInitials(user.firstName, user.lastName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                        {user.email}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-600">
                          {formatEnum(user.role.name)}
                        </span>

                        {user.requiresPasswordChange ? (
                          <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700">
                            Password Reqd
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <AccountStatus active={user.isActive} />
                      <p className="mt-2 text-[10px] font-bold text-slate-400">
                        {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>

      {/* Privileges Alert */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <div>
            <p className="font-black text-amber-900">
              Super Administrator privileges
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-amber-800">
              This dashboard provides system-wide visibility. Sensitive write
              actions should remain protected by server-side role checks and
              permanent audit logs.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: string;
  helper: string;
  tone: Tone;
}) {
  return (
    <article className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-3xl font-black text-slate-900">{value}</p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 ${TONE_STYLES[tone]}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {helper}
      </p>
    </article>
  );
}

function QueueCard({
  icon: Icon,
  title,
  description,
  count,
  href,
  linkLabel,
  tone,
}: {
  icon: ElementType;
  title: string;
  description: string;
  count: number;
  href: string;
  linkLabel: string;
  tone: Tone;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center shadow-sm hover:shadow-md transition-shadow">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${TONE_STYLES[tone]}`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-black text-slate-900">{title}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {description}
            </p>
          </div>

          <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 text-sm font-black text-slate-900">
            {count}
          </span>
        </div>

        <Link
          href={href}
          className={`mt-3 inline-flex items-center gap-1.5 rounded-md text-xs font-black text-indigo-600 transition-colors hover:text-indigo-700 ${FOCUS_RING}`}
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: ElementType;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="px-5 py-14 text-center h-full flex flex-col items-center justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 mx-auto">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <p className="mt-4 font-black text-slate-900">{title}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500 max-w-sm mx-auto">
        {description}
      </p>
      <Link
        href={actionHref}
        className={`mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 shadow-sm ${FOCUS_RING}`}
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-w-[100px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm shadow-sm">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
    </div>
  );
}

function HeroDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-4">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function AccountStatus({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase();
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}
