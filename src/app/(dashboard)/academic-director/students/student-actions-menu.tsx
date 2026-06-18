"use client";

import type { LucideIcon } from "lucide-react";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Edit3,
  Eye,
  Loader2,
  MoreHorizontal,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import {
  reactivateStudent,
  suspendStudent,
} from "@/app/actions/student.actions";

type StudentActionsMenuProps = {
  studentId: string;
  studentName: string;
  studentStatus?: string;
};

export function StudentActionsMenu({
  studentId,
  studentName,
  studentStatus,
}: StudentActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const isSuspended = studentStatus === "SUSPENDED";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSuspend = () => {
    const confirmed = window.confirm(
      `Are you sure you want to suspend ${studentName}?`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await suspendStudent(studentId);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result?.message || "Student suspended.");
      setOpen(false);
      router.refresh();
    });
  };

  const handleReactivate = () => {
    const confirmed = window.confirm(
      `Reactivate ${studentName} as an active student?`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await reactivateStudent(studentId);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result?.message || "Student reactivated.");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div ref={menuRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-900"
        aria-label={`Open actions for ${studentName}`}
      >
        {open ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-2 text-left shadow-xl shadow-slate-900/10">
          <div className="border-b border-slate-200 px-3 py-2">
            <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-500">
              Student Actions
            </p>

            <p className="mt-0.5 truncate text-sm font-black text-slate-950">
              {studentName}
            </p>
          </div>

          <div className="mt-2 space-y-1">
            <ActionLink
              href={`/academic-director/students/${studentId}`}
              icon={Eye}
              label="View Student"
              onClick={() => setOpen(false)}
            />

            <ActionLink
              href={`/academic-director/students/${studentId}/edit`}
              icon={Edit3}
              label="Edit Student"
              onClick={() => setOpen(false)}
            />

            {isSuspended ? (
              <ActionButton
                onClick={handleReactivate}
                disabled={isPending}
                icon={isPending ? Loader2 : ShieldCheck}
                label="Reactivate Student"
                tone="emerald"
                spinning={isPending}
              />
            ) : (
              <ActionButton
                onClick={handleSuspend}
                disabled={isPending}
                icon={isPending ? Loader2 : ShieldAlert}
                label="Suspend Student"
                tone="amber"
                spinning={isPending}
              />
            )}

            <button
              type="button"
              disabled
              title="Archive/Delete action will be connected later"
              className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-500/50"
            >
              <Trash2 className="h-4 w-4" />
              Archive Student
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 hover:text-slate-950"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon: Icon,
  label,
  tone,
  spinning = false,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  tone: "emerald" | "amber";
  spinning?: boolean;
}) {
  const classes =
    tone === "emerald"
      ? "text-emerald-700 hover:bg-emerald-100"
      : "text-amber-700 hover:bg-amber-100";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${classes}`}
    >
      <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
      {label}
    </button>
  );
}
