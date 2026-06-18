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
  BookOpen,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Hash,
  Layers3,
  Loader2,
  Save,
  ShieldCheck,
  Users,
} from "lucide-react";

import { updateIntake } from "@/app/actions/intake.actions";

type IntakeRecord = {
  id: string;
  code: string;
  title: string;
  year: number;
  assessmentMode: string;
  status: string;
  courseId: string;
  sequenceCounter: number;
};

type CourseOption = {
  id: string;
  code: string;
  title: string;
  category: string;
};

type EditIntakeFormProps = {
  intake: IntakeRecord;
  courses: CourseOption[];
};

export function EditIntakeForm({
  intake,
  courses,
}: EditIntakeFormProps) {
  const [
    isPending,
    startTransition,
  ] = useTransition();

  const router = useRouter();

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const formData = new FormData(
      event.currentTarget,
    );

    startTransition(async () => {
      const result =
        await updateIntake(formData);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (result?.success) {
        toast.success(
          result.message ||
            "Intake updated.",
        );

        router.push(
          `/academic-director/intakes/${intake.id}`,
        );

        router.refresh();
      }
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
              href={`/academic-director/intakes/${intake.id}`}
              aria-label="Back to intake"
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0 animate-in fade-in slide-in-from-left-3 duration-500">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
                {intake.code}
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Edit Intake
              </h1>

              <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-400">
                {intake.title}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <HeroStat
              label="Sequence"
              value={intake.sequenceCounter}
            />

            <HeroStat
              label="Year"
              value={intake.year}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <input
            type="hidden"
            name="id"
            value={intake.id}
          />

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <SectionHeader
              icon={Layers3}
              title="Intake details"
              subtitle="Code, title and admission year."
            />

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <InputWithIcon
                icon={Hash}
                id="code"
                name="code"
                label="Intake code"
                defaultValue={intake.code}
                required
                uppercase
                disabled={isPending}
              />

              <InputWithIcon
                icon={CalendarDays}
                id="year"
                name="year"
                label="Admission year"
                type="number"
                min="2000"
                max="2100"
                defaultValue={intake.year}
                required
                disabled={isPending}
              />

              <div className="space-y-2 sm:col-span-2">
                <label
                  htmlFor="title"
                  className="text-xs font-black text-slate-700"
                >
                  Intake title
                </label>

                <input
                  required
                  type="text"
                  name="title"
                  id="title"
                  defaultValue={intake.title}
                  disabled={isPending}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-bold text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <SectionHeader
              icon={BookOpen}
              title="Linked course"
              subtitle="Change only when officially required."
            />

            <div className="p-5 sm:p-6">
              <label
                htmlFor="courseId"
                className="text-xs font-black text-slate-700"
              >
                Course
              </label>

              <select
                required
                name="courseId"
                id="courseId"
                defaultValue={intake.courseId}
                disabled={isPending}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
              >
                <option value="">
                  Select course
                </option>

                {courses.map((course) => (
                  <option
                    key={course.id}
                    value={course.id}
                  >
                    {course.code} — {course.title} ({formatEnum(course.category)})
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <SectionHeader
              icon={GraduationCap}
              title="Academic setup"
              subtitle="Assessment mode and status."
            />

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <SelectField
                id="assessmentMode"
                name="assessmentMode"
                label="Assessment mode"
                defaultValue={intake.assessmentMode}
                disabled={isPending}
                options={[
                  ["CAT_AND_FINAL_EXAM", "CAT and Final Exam"],
                  ["CAT_ONLY", "CAT Only"],
                  ["NO_EXAM", "No Exam"],
                  ["PRACTICAL_ONLY", "Practical Only"],
                  ["ATTENDANCE_BASED", "Attendance Based"],
                  ["COMPETENCY_BASED", "Competency Based"],
                ]}
              />

              <SelectField
                id="status"
                name="status"
                label="Intake status"
                defaultValue={intake.status}
                disabled={isPending}
                options={[
                  ["PLANNED", "Planned"],
                  ["OPEN", "Open"],
                  ["ACTIVE", "Active"],
                  ["COMPLETED", "Completed"],
                  ["ARCHIVED", "Archived"],
                ]}
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-200/50 p-4 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-sky-700" />

                  <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Sequence Counter
                  </p>
                </div>

                <p className="mt-2 text-xl font-black text-slate-950">
                  {intake.sequenceCounter}
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                  Used for generated student numbers. Do not change casually.
                </p>
              </div>
            </div>
          </section>

          <FormFooter
            href={`/academic-director/intakes/${intake.id}`}
            isPending={isPending}
            disabled={courses.length === 0}
            label="Save Changes"
          />
        </form>

        <GuidePanel />
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0">
        <h2 className="truncate text-base font-black text-slate-950">
          {title}
        </h2>

        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function InputWithIcon({
  icon: Icon,
  id,
  name,
  label,
  type = "text",
  defaultValue,
  min,
  max,
  required = false,
  uppercase = false,
  disabled = false,
}: {
  icon: ElementType;
  id: string;
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
  min?: string;
  max?: string;
  required?: boolean;
  uppercase?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-xs font-black text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

        <input
          required={required}
          type={type}
          name={name}
          id={id}
          min={min}
          max={max}
          defaultValue={defaultValue}
          disabled={disabled}
          className={`h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60 ${
            uppercase
              ? "font-mono uppercase tracking-wide"
              : ""
          }`}
        />
      </div>
    </div>
  );
}

function SelectField({
  id,
  name,
  label,
  defaultValue,
  options,
  disabled = false,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  options: [string, string][];
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-xs font-black text-slate-700"
      >
        {label}
      </label>

      <select
        required
        name={name}
        id={id}
        defaultValue={defaultValue}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

function FormFooter({
  href,
  isPending,
  disabled,
  label,
}: {
  href: string;
  isPending: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-3 border-t border-slate-200 bg-slate-50/90 px-3 py-3 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={href}
          className="inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-black text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={isPending || disabled}
          className="group inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              {label}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function GuidePanel() {
  return (
    <aside className="xl:sticky xl:top-24 xl:self-start">
      <div className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-base font-black text-slate-950">
              Edit rules
            </h2>

            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Keep cohort records stable.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <GuideItem text="Avoid changing codes after students are admitted." />
          <GuideItem text="Assessment mode affects result handling." />
          <GuideItem text="Status controls admission and academic flow." />
        </div>
      </div>
    </aside>
  );
}

function GuideItem({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

      <p className="text-xs font-bold leading-5 text-slate-600">
        {text}
      </p>
    </div>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
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

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}
