"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Power,
  PowerOff,
} from "lucide-react";

import { toggleCourseUnitStatus } from "@/app/actions/course-unit.actions";

type CourseUnitStatusControlProps = {
  unitId: string;
  unitCode: string;
  unitTitle: string;
  isActive: boolean;
  mode?: "compact" | "full";
};

export function CourseUnitStatusControl({
  unitId,
  unitCode,
  unitTitle,
  isActive,
  mode = "compact",
}: CourseUnitStatusControlProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleToggle = () => {
    const action = isActive ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${unitCode} — ${unitTitle}?`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await toggleCourseUnitStatus(unitId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message || "Course unit status updated.");
      router.refresh();
    });
  };

  const activeClasses = isActive
    ? "bg-emerald-100 text-emerald-700"
    : "bg-slate-300 text-slate-700";

  const buttonClasses = isActive
    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200";

  if (mode === "full") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-black transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60 ${buttonClasses}`}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : isActive ? (
          <PowerOff className="mr-2 h-4 w-4" />
        ) : (
          <Power className="mr-2 h-4 w-4" />
        )}

        {isPending
          ? "Updating"
          : isActive
            ? "Deactivate Unit"
            : "Activate Unit"}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${activeClasses}`}
      >
        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" />
        {isActive ? "Active" : "Inactive"}
      </span>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`inline-flex h-8 items-center justify-center rounded-xl px-2.5 text-[10px] font-black transition-all disabled:cursor-not-allowed disabled:opacity-60 ${buttonClasses}`}
      >
        {isPending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : isActive ? (
          <PowerOff className="mr-1.5 h-3.5 w-3.5" />
        ) : (
          <Power className="mr-1.5 h-3.5 w-3.5" />
        )}

        {isPending
          ? "Updating"
          : isActive
            ? "Deactivate"
            : "Activate"}
      </button>
    </div>
  );
}
