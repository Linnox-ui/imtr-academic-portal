import type { ElementType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CheckCircle2, MessageSquare, Send } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendClassAnnouncement } from "./actions";

export const dynamic = "force-dynamic";

export default async function LecturerCommunicationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = searchParams ? await searchParams : {};
  const success = readParam(params.success);
  const error = readParam(params.error);

  // Fetch unique intakes this lecturer is currently teaching
  const activeAllocations = await prisma.lecturerUnitAllocation.findMany({
    where: { lecturerId: session.user.id, isActive: true },
    select: {
      intake: { select: { id: true, code: true, title: true } },
    },
  });

  // Deduplicate intakes so they don't see the same class twice in the dropdown
  const uniqueIntakesMap = new Map();
  activeAllocations.forEach((alloc) => {
    uniqueIntakesMap.set(alloc.intake.id, alloc.intake);
  });
  const assignedIntakes = Array.from(uniqueIntakesMap.values());

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Lecturer Workspace
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Class Announcements
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              Broadcast instant system notifications to students in your
              assigned classes.
            </p>
          </div>
        </div>
      </section>

      {success && <Notice tone="success" message={success} />}
      {error && <Notice tone="error" message={error} />}

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-5 sm:p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">
                  Compose Announcement
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Send a message to an entire class cohort.
                </p>
              </div>
            </div>

            <form
              action={sendClassAnnouncement}
              className="space-y-5 p-5 sm:p-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Select Class
                </label>
                <select
                  required
                  name="intakeId"
                  defaultValue=""
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
                >
                  <option value="" disabled>
                    Choose a class...
                  </option>
                  {assignedIntakes.map((intake) => (
                    <option key={intake.id} value={intake.id}>
                      {intake.code} — {intake.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Subject
                </label>
                <input
                  required
                  name="subject"
                  placeholder="e.g., Assignment 1 Deadline Extended"
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Message
                </label>
                <textarea
                  required
                  name="message"
                  rows={6}
                  placeholder="Write your announcement here..."
                  className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition-all focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10"
                />
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-5 items-center">
                  <input
                    type="checkbox"
                    id="sendEmailCopy"
                    name="sendEmailCopy"
                    className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                  />
                </div>
                <label
                  htmlFor="sendEmailCopy"
                  className="flex flex-col cursor-pointer"
                >
                  <span className="text-sm font-black text-slate-700">
                    Send copy to student emails
                  </span>
                  <span className="text-xs font-semibold text-slate-500 mt-0.5">
                    Email integration currently in staging. System defaults to
                    in-app alerts.
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={assignedIntakes.length === 0}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-sky-600 px-6 text-sm font-black text-white shadow-lg shadow-sky-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Broadcast Announcement
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">
                  How it works
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Student Notifications
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <GuideItem text="Students receive a live notification in their student portal." />
              <GuideItem text="You can only message classes you are actively assigned to teach." />
              <GuideItem text="Emails will automatically trigger once the external provider is hooked up." />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function Notice({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${styles}`}>
      {decodeURIComponent(message)}
    </div>
  );
}

function GuideItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
      <p className="text-xs font-bold leading-5 text-slate-600">{text}</p>
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
