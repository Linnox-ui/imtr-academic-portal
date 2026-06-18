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
  CalendarRange,
  CheckCircle2,
  GraduationCap,
  Layers3,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
} from "lucide-react";

import {
  createCourseSemester,
  createCourseYear,
} from "@/app/actions/course-structure.actions";

type SemesterRecord = {
  id: string;
  title: string;
  semesterNumber: number | null;
  sequence: number;
  periodType: string;
  isActive: boolean;
  unitCount: number;
};

type YearRecord = {
  id: string;
  title: string;
  yearNumber: number;
  sequence: number;
  isActive: boolean;
  semesters: SemesterRecord[];
};

type CourseStructure = {
  id: string;
  code: string;
  title: string;
  category: string;
  years: YearRecord[];
};

type CourseStructureManagerProps = {
  course: CourseStructure;
};

export function CourseStructureManager({
  course,
}: CourseStructureManagerProps) {
  const [
    isCreatingYear,
    startYearTransition,
  ] = useTransition();

  const [
    isCreatingSemester,
    startSemesterTransition,
  ] = useTransition();

  const router = useRouter();

  const totalPeriods =
    course.years.reduce(
      (total, year) =>
        total + year.semesters.length,
      0,
    );

  const totalAssignedUnits =
    course.years.reduce(
      (yearTotal, year) =>
        yearTotal +
        year.semesters.reduce(
          (semesterTotal, semester) =>
            semesterTotal +
            semester.unitCount,
          0,
        ),
      0,
    );

  const handleYearSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    startYearTransition(async () => {
      const result =
        await createCourseYear(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.message ||
          "Course year created.",
      );

      form.reset();
      router.refresh();
    });
  };

  const handleSemesterSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    startSemesterTransition(async () => {
      const result =
        await createCourseSemester(
          formData,
        );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.message ||
          "Academic period created.",
      );

      form.reset();
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

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Course Structure
              </h1>

              <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-400">
                {course.title}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <HeroStat
              label="Years"
              value={course.years.length}
            />

            <HeroStat
              label="Periods"
              value={totalPeriods}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={GraduationCap}
          label="Years"
          value={course.years.length}
          helper="Academic years"
        />

        <StatCard
          icon={CalendarRange}
          label="Periods"
          value={totalPeriods}
          helper="Semesters or blocks"
        />

        <StatCard
          icon={Layers3}
          label="Units"
          value={totalAssignedUnits}
          helper="Assigned units"
        />

        <StatCard
          icon={BookOpen}
          label="Code"
          value={course.code}
          helper="Course reference"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <form
          onSubmit={handleYearSubmit}
          className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm"
        >
          <input
            type="hidden"
            name="courseId"
            value={course.id}
          />

          <SectionHeader
            icon={GraduationCap}
            title="Add Year"
            subtitle="Create Year 1, Year 2 or a training year."
          />

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <Field
              name="title"
              label="Year title"
              placeholder="Year 1"
            />

            <NumberField
              name="yearNumber"
              label="Year number"
              defaultValue={
                course.years.length + 1
              }
            />

            <NumberField
              name="sequence"
              label="Sequence"
              defaultValue={
                course.years.length + 1
              }
            />

            <ActiveCheckbox />
          </div>

          <FormFooter
            isPending={isCreatingYear}
            pendingLabel="Creating"
            label="Add Year"
            icon={Plus}
          />
        </form>

        <form
          onSubmit={handleSemesterSubmit}
          className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm"
        >
          <input
            type="hidden"
            name="courseId"
            value={course.id}
          />

          <SectionHeader
            icon={CalendarRange}
            title="Add Period"
            subtitle="Create a semester or training block."
          />

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="space-y-2 sm:col-span-2">
              <label
                htmlFor="courseYearId"
                className="text-xs font-black text-slate-700"
              >
                Course year
              </label>

              <select
                required
                name="courseYearId"
                id="courseYearId"
                disabled={
                  isCreatingSemester ||
                  course.years.length === 0
                }
                className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
              >
                <option value="">
                  Select year
                </option>

                {course.years.map((year) => (
                  <option
                    key={year.id}
                    value={year.id}
                  >
                    {year.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="periodType"
                className="text-xs font-black text-slate-700"
              >
                Period type
              </label>

              <select
                required
                name="periodType"
                id="periodType"
                defaultValue="SEMESTER"
                disabled={isCreatingSemester}
                className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
              >
                <option value="SEMESTER">
                  Semester
                </option>
                <option value="TRAINING_BLOCK">
                  Training Block
                </option>
              </select>
            </div>

            <Field
              name="title"
              label="Period title"
              placeholder="Semester 1"
              disabled={isCreatingSemester}
            />

            <NumberField
              name="semesterNumber"
              label="Semester no."
              defaultValue={1}
              required={false}
              disabled={isCreatingSemester}
            />

            <NumberField
              name="sequence"
              label="Sequence"
              defaultValue={1}
              disabled={isCreatingSemester}
            />

            <div className="sm:col-span-2">
              <ActiveCheckbox />
            </div>
          </div>

          <FormFooter
            isPending={isCreatingSemester}
            pendingLabel="Creating"
            label="Add Period"
            icon={Save}
            disabled={course.years.length === 0}
          />
        </form>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Layers3 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Structure
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950">
                Years and Periods
              </h2>
            </div>
          </div>

          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
            {course.years.length}
          </span>
        </div>

        {course.years.length === 0 ? (
          <EmptyStructure />
        ) : (
          <div className="mt-5 space-y-4">
            {course.years.map((year) => (
              <YearCard
                key={year.id}
                year={year}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck className="h-5 w-5" />
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Workflow
            </p>

            <h2 className="mt-1 text-lg font-black text-slate-950">
              Setup Order
            </h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <GuideItem
            number="1"
            title="Create years"
            text="Add the course years."
          />

          <GuideItem
            number="2"
            title="Create periods"
            text="Add semesters or blocks."
          />

          <GuideItem
            number="3"
            title="Assign units"
            text="Coordinators submit unit structures."
          />
        </div>
      </section>
    </div>
  );
}

function YearCard({
  year,
}: {
  year: YearRecord;
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-200/50">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-100/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <GraduationCap className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h3 className="break-words text-base font-black text-slate-950">
              {year.title}
            </h3>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              Year {year.yearNumber} · Sequence {year.sequence}
            </p>
          </div>
        </div>

        <StatusBadge
          active={year.isActive}
        />
      </div>

      {year.semesters.length === 0 ? (
        <div className="p-5 text-sm font-semibold text-slate-500">
          No periods added.
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {year.semesters.map((semester) => (
            <PeriodCard
              key={semester.id}
              semester={semester}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function PeriodCard({
  semester,
}: {
  semester: SemesterRecord;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/70 p-4 shadow-sm">
      <div
        className={`absolute inset-y-0 left-0 w-1 ${
          semester.isActive
            ? "bg-emerald-500"
            : "bg-slate-400"
        }`}
      />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="break-words text-sm font-black text-slate-950">
              {semester.title}
            </p>

            <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-sky-700">
              {formatEnum(
                semester.periodType,
              )}
            </p>
          </div>

          <StatusBadge
            active={semester.isActive}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniDetail
            label="Sequence"
            value={`${semester.sequence}`}
          />

          <MiniDetail
            label="Units"
            value={`${semester.unitCount}`}
          />
        </div>
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

function Field({
  name,
  label,
  placeholder,
  disabled = false,
}: {
  name: string;
  label: string;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="text-xs font-black text-slate-700"
      >
        {label}
      </label>

      <input
        required
        type="text"
        name={name}
        id={name}
        placeholder={placeholder}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-bold text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
      />
    </div>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
  required = true,
  disabled = false,
}: {
  name: string;
  label: string;
  defaultValue: number;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="text-xs font-black text-slate-700"
      >
        {label}
      </label>

      <input
        required={required}
        type="number"
        min="1"
        name={name}
        id={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
      />
    </div>
  );
}

function ActiveCheckbox() {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-4">
      <input
        type="checkbox"
        name="isActive"
        defaultChecked
        className="mt-1 h-4 w-4 accent-sky-700"
      />

      <div>
        <p className="text-sm font-black text-slate-950">
          Active
        </p>

        <p className="mt-1 text-xs font-semibold text-slate-500">
          Available for planning.
        </p>
      </div>
    </label>
  );
}

function FormFooter({
  isPending,
  pendingLabel,
  label,
  icon: Icon,
  disabled = false,
}: {
  isPending: boolean;
  pendingLabel: string;
  label: string;
  icon: ElementType;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end border-t border-slate-200 bg-slate-200/40 p-4">
      <button
        type="submit"
        disabled={isPending || disabled}
        className="group inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-xs font-black text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {pendingLabel}
          </>
        ) : (
          <>
            <Icon className="mr-2 h-4 w-4" />
            {label}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>
    </div>
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

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-[11px] font-bold text-slate-500">
            {helper}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
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
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-300 text-slate-700"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function MiniDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-200/50 p-2.5">
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function GuideItem({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-200/50 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">
          {number}
        </span>

        <p className="text-sm font-black text-slate-950">
          {title}
        </p>
      </div>

      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function EmptyStructure() {
  return (
    <div className="mt-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center">
      <CalendarRange className="h-8 w-8 text-slate-400" />

      <p className="mt-3 text-sm font-black text-slate-700">
        No structure yet
      </p>

      <p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">
        Add a course year first, then add periods under it.
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
