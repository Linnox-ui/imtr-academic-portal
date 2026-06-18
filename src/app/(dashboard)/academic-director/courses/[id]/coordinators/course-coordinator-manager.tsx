"use client";

import type {
  ElementType,
  FormEvent,
} from "react";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";

import {
  assignCourseCoordinator,
  toggleCourseCoordinatorStatus,
} from "@/app/actions/course-coordinator.actions";

type CoordinatorOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type CoordinatorAssignment = {
  id: string;
  isActive: boolean;
  assignedAt: string;
  endedAt: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
  };
  assignedBy: {
    firstName: string;
    lastName: string;
  };
};

type CourseCoordinatorManagerProps = {
  course: {
    id: string;
    code: string;
    title: string;
    category: string;
  };
  coordinatorOptions: CoordinatorOption[];
  assignments: CoordinatorAssignment[];
};

export function CourseCoordinatorManager({
  course,
  coordinatorOptions,
  assignments,
}: CourseCoordinatorManagerProps) {
  const [
    isAssigning,
    startAssignTransition,
  ] = useTransition();

  const [
    isUpdating,
    startUpdateTransition,
  ] = useTransition();

  const router = useRouter();

  const activeAssignments =
    assignments.filter(
      (assignment) => assignment.isActive,
    );

  const assignedUserIds = new Set(
    activeAssignments.map(
      (assignment) => assignment.user.id,
    ),
  );

  const availableCoordinators =
    coordinatorOptions.filter(
      (coordinator) =>
        !assignedUserIds.has(coordinator.id),
    );

  const handleAssign = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    startAssignTransition(async () => {
      const result =
        await assignCourseCoordinator(
          formData,
        );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.message ||
          "Coordinator assigned.",
      );

      form.reset();
      router.refresh();
    });
  };

  const handleToggle = (
    assignment: CoordinatorAssignment,
  ) => {
    const action = assignment.isActive
      ? "deactivate"
      : "reactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${assignment.user.firstName} ${assignment.user.lastName} for ${course.code}?`,
    );

    if (!confirmed) {
      return;
    }

    startUpdateTransition(async () => {
      const result =
        await toggleCourseCoordinatorStatus(
          assignment.id,
        );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.message ||
          "Assignment updated.",
      );

      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href={`/academic-director/courses/${course.id}`}
              aria-label="Back to course"
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0 animate-in fade-in slide-in-from-left-3 duration-500">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
                {course.code} ·{" "}
                {formatEnum(course.category)}
              </p>

              <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">
                Course Coordinators
              </h1>

              <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-400">
                {course.title}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <HeroStat
              label="Active"
              value={activeAssignments.length}
            />

            <HeroStat
              label="Available"
              value={availableCoordinators.length}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <form
          onSubmit={handleAssign}
          className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm xl:self-start"
        >
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <UserCheck className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-base font-black text-slate-950">
                Assign Coordinator
              </h2>

              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                Select an eligible account.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <input
              type="hidden"
              name="courseId"
              value={course.id}
            />

            <div className="space-y-2">
              <label
                htmlFor="userId"
                className="text-xs font-black text-slate-700"
              >
                Coordinator
              </label>

              <select
                required
                name="userId"
                id="userId"
                disabled={
                  isAssigning ||
                  availableCoordinators.length === 0
                }
                className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
              >
                <option value="">
                  Select coordinator
                </option>

                {availableCoordinators.map(
                  (coordinator) => (
                    <option
                      key={coordinator.id}
                      value={coordinator.id}
                    >
                      {coordinator.firstName}{" "}
                      {coordinator.lastName} —{" "}
                      {coordinator.email}
                    </option>
                  ),
                )}
              </select>
            </div>

            {coordinatorOptions.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-800">
                  No coordinator accounts
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                  Create a user with the coordinator role first.
                </p>
              </div>
            ) : null}

            {coordinatorOptions.length > 0 &&
            availableCoordinators.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-200/50 p-4">
                <p className="text-xs font-bold leading-5 text-slate-600">
                  All eligible coordinators are already assigned.
                </p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={
                isAssigning ||
                availableCoordinators.length === 0
              }
              className="group inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Assigning
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-5 w-5" />
                  Assign
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </form>

        <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Assignments
                </p>

                <h2 className="mt-1 text-lg font-black text-slate-950">
                  Coordinators
                </h2>
              </div>
            </div>

            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
              {assignments.length}
            </span>
          </div>

          {assignments.length === 0 ? (
            <EmptyAssignments />
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {assignments.map((assignment) => (
                <CoordinatorCard
                  key={assignment.id}
                  assignment={assignment}
                  isUpdating={isUpdating}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Permissions
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-950">
              Coordinator Access
            </h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <PermissionCard
            icon={BookOpen}
            title="Manage proposals"
            text="Prepare semester-unit structures."
          />

          <PermissionCard
            icon={BadgeCheck}
            title="Submit review"
            text="Send proposals for approval."
          />

          <PermissionCard
            icon={CheckCircle2}
            title="No self-approval"
            text="Approval stays with Academic Director."
          />
        </div>
      </section>
    </div>
  );
}

function CoordinatorCard({
  assignment,
  isUpdating,
  onToggle,
}: {
  assignment: CoordinatorAssignment;
  isUpdating: boolean;
  onToggle: (
    assignment: CoordinatorAssignment,
  ) => void;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-200/50 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-slate-100 hover:shadow-md">
      <div className="flex items-start gap-3">
        <CoordinatorAvatar
          firstName={assignment.user.firstName}
          lastName={assignment.user.lastName}
        />

        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-black text-slate-950">
            {assignment.user.firstName}{" "}
            {assignment.user.lastName}
          </p>

          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {assignment.user.email}
            </span>
          </p>
        </div>

        <StatusBadge
          active={assignment.isActive}
        />
      </div>

      <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
        <DetailRow
          label="Assigned"
          value={formatDate(
            assignment.assignedAt,
          )}
        />

        <DetailRow
          label="By"
          value={`${assignment.assignedBy.firstName} ${assignment.assignedBy.lastName}`}
        />

        {assignment.endedAt ? (
          <DetailRow
            label="Ended"
            value={formatDate(
              assignment.endedAt,
            )}
          />
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => onToggle(assignment)}
        disabled={isUpdating}
        className={`mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl text-xs font-black transition-all disabled:opacity-60 ${
          assignment.isActive
            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
        }`}
      >
        {isUpdating ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : assignment.isActive ? (
          <UserMinus className="mr-2 h-4 w-4" />
        ) : (
          <UserCheck className="mr-2 h-4 w-4" />
        )}

        {assignment.isActive
          ? "Deactivate"
          : "Reactivate"}
      </button>
    </article>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[96px] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center">
      <p className="text-xl font-black text-white">
        {value}
      </p>

      <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
    </div>
  );
}

function CoordinatorAvatar({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const initials = `${firstName[0] || ""}${
    lastName[0] || ""
  }`;

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sm font-black text-sky-700">
      {initials.toUpperCase()}
    </div>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-300 text-slate-700"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="font-bold text-slate-500">
        {label}
      </span>

      <span className="text-right font-black text-slate-800">
        {value}
      </span>
    </div>
  );
}

function PermissionCard({
  icon: Icon,
  title,
  text,
}: {
  icon: ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-200/50 p-4">
      <Icon className="h-5 w-5 text-sky-700" />

      <p className="mt-3 text-sm font-black text-slate-950">
        {title}
      </p>

      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function EmptyAssignments() {
  return (
    <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center">
      <Users className="h-8 w-8 text-slate-400" />

      <p className="mt-3 text-sm font-black text-slate-700">
        No coordinator assigned
      </p>

      <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">
        Select an eligible coordinator from the form.
      </p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}
