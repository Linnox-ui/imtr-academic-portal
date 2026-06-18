import type { ElementType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  CheckCircle2,
  ExternalLink,
  Mailbox,
  Sparkles,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markAllAsRead, markNotificationAsRead } from "./actions";

export const dynamic = "force-dynamic";

export default async function StudentNotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Audit: Use the direct registry link to capture records created by lecturer
  const student = await prisma.student.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });

  // Fetch all notifications where the user matches OR the registry record matches
  const notifications = await prisma.notification.findMany({
    where: {
      OR: [{ userId: session.user.id }, { studentId: student?.id || "VOID" }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { firstName: true, lastName: true } },
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-10">
      {/* --- HERO SECTION --- */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-8 text-white shadow-2xl shadow-slate-900/20 sm:px-10 sm:py-10 border border-slate-800">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-emerald-500/15 blur-[80px]" />

        {/* Subtle grid overlay for texture */}
        <div className="pointer-events-none absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-in fade-in slide-in-from-left-4 duration-700">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-sky-400" />
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-400">
                Student Workspace
              </p>
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
              Notifications
            </h1>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-slate-400">
              Stay up to date with class announcements, academic alerts, and
              direct messages from your lecturers.
            </p>
          </div>

          {unreadCount > 0 && (
            <form
              action={async () => {
                "use server";
                await markAllAsRead();
              }}
              className="animate-in fade-in slide-in-from-right-4 duration-700 delay-150"
            >
              <button
                type="submit"
                className="group relative inline-flex h-12 w-fit items-center justify-center overflow-hidden rounded-2xl bg-white px-5 text-xs font-black text-slate-900 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-sky-500/20 active:translate-y-0"
              >
                <span className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-slate-100 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500 transition-transform group-hover:scale-110" />
                <span className="relative">Mark all as read</span>
              </button>
            </form>
          )}
        </div>
      </section>

      {/* --- INBOX SECTION --- */}
      <section className="overflow-hidden rounded-[32px] border border-slate-200/60 bg-slate-50/50 shadow-sm backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/50 p-6 sm:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-sky-100 to-sky-50 text-sky-600 shadow-inner">
              <Mailbox className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Your Inbox
              </h2>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                {unreadCount === 0
                  ? "You're all caught up."
                  : `You have ${unreadCount} unread message${unreadCount === 1 ? "" : "s"}.`}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {notifications.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`group relative flex flex-col gap-4 rounded-[24px] p-5 transition-all duration-300 sm:flex-row sm:items-start sm:p-6 ${
                    notification.isRead
                      ? "bg-white border border-transparent shadow-sm opacity-80 hover:opacity-100 hover:border-slate-200 hover:shadow-md"
                      : "bg-gradient-to-r from-sky-50/80 to-white border border-sky-100 shadow-md hover:shadow-lg hover:border-sky-200"
                  }`}
                >
                  {/* Icon Avatar */}
                  <div
                    className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] shadow-inner transition-colors ${
                      notification.isRead
                        ? "bg-slate-100 text-slate-400"
                        : "bg-sky-100 text-sky-600"
                    }`}
                  >
                    <BellRing className="h-5 w-5" />
                    {!notification.isRead && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white bg-sky-500"></span>
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    {/* Sender Eyebrow */}
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {notification.sender
                          ? `From: ${notification.sender.firstName} ${notification.sender.lastName}`
                          : "System Announcement"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3
                        className={`text-base font-black tracking-tight ${notification.isRead ? "text-slate-700" : "text-slate-950"}`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-sky-600 border border-sky-500/20">
                          New
                        </span>
                      )}
                    </div>

                    <p
                      className={`mt-2 text-sm leading-relaxed ${notification.isRead ? "text-slate-500" : "text-slate-700 font-medium"}`}
                    >
                      {notification.message}
                    </p>

                    {/* Footer Actions & Meta */}
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <p className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {new Intl.DateTimeFormat("en-KE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(notification.createdAt)}
                      </p>

                      {notification.actionUrl && (
                        <Link
                          href={notification.actionUrl}
                          className="inline-flex items-center rounded-lg bg-sky-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-sky-600 transition-colors hover:bg-sky-100"
                        >
                          View Details{" "}
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  {!notification.isRead && (
                    <form
                      action={async () => {
                        "use server";
                        await markNotificationAsRead(notification.id);
                      }}
                      className="mt-2 shrink-0 sm:mt-0 sm:ml-auto"
                    >
                      <button
                        type="submit"
                        className="inline-flex h-10 w-full sm:w-auto items-center justify-center rounded-[14px] border border-slate-200 bg-white px-4 text-[11px] font-black uppercase tracking-wider text-slate-600 shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 active:translate-y-0"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark Read
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-200/80 bg-white text-center sm:m-2">
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-slate-50 text-slate-300 shadow-inner mb-4">
                <Mailbox className="h-10 w-10" />
              </div>
              <p className="text-lg font-black text-slate-700 tracking-tight">
                Your inbox is empty
              </p>
              <p className="mt-2 max-w-sm text-sm font-semibold leading-relaxed text-slate-500">
                When lecturers or administrators send you announcements, they
                will appear here.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
