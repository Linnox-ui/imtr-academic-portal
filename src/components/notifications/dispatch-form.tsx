"use client";

import { useState, useTransition } from "react";
import {
  Send,
  AlertCircle,
  CheckCircle2,
  Megaphone,
  Loader2,
} from "lucide-react";
import {
  dispatchGlobalNotification,
  type TargetAudience,
} from "@/app/actions/notification.actions";

interface DispatchFormProps {
  senderRole: string;
  hasCoordinatorAccess?: boolean;
}

export function DispatchForm({
  senderRole,
  hasCoordinatorAccess,
}: DispatchFormProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({
    type: "idle",
    message: "",
  });

  // Normalize the role string to uppercase to avoid case-sensitivity issues
  const role = (senderRole || "").toUpperCase();

  // Forgiving check for all possible admin/director database strings
  const isDirectorOrAdmin =
    role === "ACADEMIC_DIRECTOR" ||
    role === "SUPER_ADMIN" ||
    role === "ADMIN" ||
    role === "SUPERADMIN";

  const isCoordinator = hasCoordinatorAccess === true;

  const audienceOptions: {
    value: TargetAudience;
    label: string;
    description: string;
  }[] = [
    {
      value: "ALL_STUDENTS",
      label: "All Students",
      description: "Broadcast to all enrolled students",
    },
    {
      value: "ALL_LECTURERS",
      label: "All Lecturers",
      description: "Broadcast to all teaching staff",
    },
  ];

  // Only add global options if the user is a Director or Admin
  if (isDirectorOrAdmin) {
    audienceOptions.push(
      {
        value: "ACTIVE_COORDINATORS",
        label: "Active Coordinators",
        description:
          "Broadcast to lecturers currently assigned as coordinators",
      },
      {
        value: "EVERYONE",
        label: "Institute-Wide (Everyone)",
        description: "Send to all students, lecturers, and coordinators",
      },
    );
  }

  async function handleSubmit(formData: FormData) {
    setStatus({ type: "idle", message: "" });

    const title = formData.get("title") as string;
    const message = formData.get("message") as string;
    const targetAudience = formData.get("targetAudience") as TargetAudience;
    const actionUrl = formData.get("actionUrl") as string;

    if (!title || !message || !targetAudience) {
      setStatus({
        type: "error",
        message: "Please fill in all required fields.",
      });
      return;
    }

    startTransition(async () => {
      const result = await dispatchGlobalNotification({
        title,
        message,
        targetAudience,
        actionUrl: actionUrl || undefined,
      });

      if (result.success) {
        setStatus({
          type: "success",
          message: result.message || "Notification dispatched successfully!",
        });
        const formElement = document.getElementById(
          "dispatch-form",
        ) as HTMLFormElement;
        if (formElement) formElement.reset();
      } else {
        setStatus({
          type: "error",
          message: result.error || "Failed to dispatch notification.",
        });
      }
    });
  }

  // Security Catch
  if (!isDirectorOrAdmin && !isCoordinator) {
    return (
      <div className="rounded-2xl bg-rose-50 p-6 text-center border border-rose-100">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-3" />
        <h3 className="text-lg font-bold text-rose-900">Access Denied</h3>
        <p className="text-sm font-medium text-rose-700">
          Your account does not have notification dispatch privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl shadow-slate-200/40">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 px-6 py-8 text-white sm:px-8">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 backdrop-blur-sm">
          <Megaphone className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Dispatch Center
        </h2>
        <p className="mt-2 text-sm font-medium text-slate-400">
          Send global announcements and alerts directly to targeted portal
          inboxes.
        </p>
      </div>

      <form
        id="dispatch-form"
        action={handleSubmit}
        className="p-6 sm:p-8 space-y-6"
      >
        {status.type === "error" && (
          <div className="flex animate-in fade-in slide-in-from-top-2 items-center gap-3 rounded-2xl bg-rose-50 p-4 text-rose-700 border border-rose-100">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">{status.message}</p>
          </div>
        )}
        {status.type === "success" && (
          <div className="flex animate-in fade-in slide-in-from-top-2 items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">{status.message}</p>
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="targetAudience"
            className="text-sm font-bold text-slate-900"
          >
            Target Audience <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <select
              id="targetAudience"
              name="targetAudience"
              required
              disabled={isPending}
              defaultValue=""
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition-all focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 disabled:opacity-50"
            >
              <option value="" disabled>
                Select an audience...
              </option>
              {audienceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-bold text-slate-900">
            Notification Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            disabled={isPending}
            placeholder="e.g., Final Examination Timetable Update"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-bold text-slate-900">
            Message Body <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            disabled={isPending}
            placeholder="Type the announcement details here..."
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="actionUrl"
            className="text-sm font-bold text-slate-900 flex items-center justify-between"
          >
            <span>
              Action URL{" "}
              <span className="text-slate-400 font-medium">(Optional)</span>
            </span>
          </label>
          <input
            type="url"
            id="actionUrl"
            name="actionUrl"
            disabled={isPending}
            placeholder="https://example.com/timetable"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-500/10 disabled:opacity-50"
          />
          <p className="text-xs font-semibold text-slate-500">
            If provided, a "View Details" link will appear on the notification.
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-6 py-4 text-sm font-black text-white transition-all hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/20 disabled:pointer-events-none disabled:opacity-70 active:scale-[0.98]"
        >
          {isPending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Dispatching...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              <span>Send Broadcast</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
