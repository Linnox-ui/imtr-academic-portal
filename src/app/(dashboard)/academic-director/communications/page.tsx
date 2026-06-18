import { redirect } from "next/navigation";
import {
  Megaphone,
  BookOpen,
  Activity,
  Info,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DispatchForm } from "@/components/notifications/dispatch-form";

export const dynamic = "force-dynamic";

export default async function AcademicDirectorNotificationsPage() {
  const session = await auth();

  // 1. Authentication Gate
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Normalize the role string
  const role = (session.user.role || "").toUpperCase();

  // 2. Strict Security Authorization Gate
  // Allow Director, and fallback for Admins observing this route
  const isDirectorOrAdmin =
    role === "ACADEMIC_DIRECTOR" ||
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "SUPERADMIN";

  if (!isDirectorOrAdmin) {
    redirect("/unauthorized");
  }

  // Safely extract custom coordinator access if present
  const hasCoordinatorAccess =
    (session.user as any).hasCoordinatorAccess === true;

  // 3. Fetch Quick Telemetry (Total broadcasts sent by this specific director)
  const personalDispatchCount = await prisma.notification.count({
    where: { senderId: session.user.id },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      {/* --- HERO BANNER --- */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-10 text-white shadow-2xl shadow-slate-900/20 sm:px-10 sm:py-10 border border-slate-800">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-indigo-500/15 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-sky-500/10 blur-[90px]" />

        {/* Subtle grid overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 mix-blend-overlay"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-left-4 duration-700">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400">
                Academic Directorate
              </p>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
              Communications Hub
            </h1>
            <p className="max-w-xl text-sm font-semibold leading-relaxed text-slate-400 pt-1">
              Official dispatch terminal for academic policy updates, exam
              timetables, and staff directives.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-5 py-3 backdrop-blur-md border border-white/10">
            <Megaphone className="h-5 w-5 text-indigo-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Broadcast Rights
              </p>
              <p className="text-sm font-black text-white">Institute-Wide</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- TWO-COLUMN WORKSPACE --- */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-start">
        {/* LEFT COLUMN: The Dispatch Form */}
        <section className="lg:col-span-2 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
          <DispatchForm
            senderRole={role}
            hasCoordinatorAccess={hasCoordinatorAccess}
          />
        </section>

        {/* RIGHT COLUMN: System Telemetry & Guidelines */}
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
          {/* Telemetry Card */}
          <div className="rounded-[32px] border border-slate-200/60 bg-white p-6 shadow-xl shadow-slate-200/40">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Directorate Telemetry
                </h2>
                <p className="text-xs font-semibold text-slate-500">
                  Live session context
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3.5 text-xs">
                <span className="font-bold text-slate-500">
                  Active Identity
                </span>
                <span className="font-black text-indigo-600 tracking-wide uppercase">
                  {role.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3.5 text-xs">
                <span className="font-bold text-slate-500">
                  Clearance Level
                </span>
                <span className="flex items-center gap-1.5 font-black text-slate-800">
                  <GraduationCap className="h-3 w-3 text-indigo-500" />{" "}
                  Executive
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3.5 text-xs">
                <span className="font-bold text-slate-500">
                  Total Dispatches
                </span>
                <span className="font-black text-slate-800">
                  {personalDispatchCount} Sent
                </span>
              </div>
            </div>
          </div>

          {/* Guidelines Card */}
          <div className="rounded-[32px] border border-slate-200/60 bg-slate-50 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <Info className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-black text-slate-900">
                Dispatch Protocols
              </h2>
            </div>

            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-xs font-medium text-slate-600">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  <strong>Institute-Wide</strong> broadcasts should be utilized
                  for final exam timetables, semester shifts, and major policy
                  updates.
                </span>
              </li>
              <li className="flex items-start gap-2 text-xs font-medium text-slate-600">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  <strong>Active Coordinators</strong> should be selected for
                  departmental directives, syllabus amendments, and workflow
                  notices.
                </span>
              </li>
              <li className="flex items-start gap-2 text-xs font-medium text-slate-600">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>
                  Messages are permanently written to the portal inboxes.{" "}
                  <strong>Verify all dates before dispatching.</strong>
                </span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
