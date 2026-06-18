"use client";

import type {
  ElementType,
  FormEvent,
} from "react";

import {
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Hash,
  Layers3,
  Loader2,
  Save,
  ShieldCheck,
  ToggleLeft,
} from "lucide-react";

import { createCourseUnit } from "@/app/actions/course-unit.actions";

type CourseOption = {
  id: string;
  code: string;
  title: string;
  category: string;
};

type NewCourseUnitFormProps = {
  courses: CourseOption[];
};

export function NewCourseUnitForm({
  courses,
}: NewCourseUnitFormProps) {
  const [
    selectedCourseId,
    setSelectedCourseId,
  ] = useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const router = useRouter();

  const selectedCourse = useMemo(
    () =>
      courses.find(
        (course) =>
          course.id === selectedCourseId,
      ),
    [courses, selectedCourseId],
  );

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const formData = new FormData(
      event.currentTarget,
    );

    startTransition(async () => {
      const result =
        await createCourseUnit(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.message ||
          "Course unit created.",
      );

      router.push(
        "/academic-director/course-units",
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
              href="/academic-director/course-units"
              aria-label="Back to course units"
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0 animate-in fade-in slide-in-from-left-3 duration-500">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
                Course Units
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Add Unit
              </h1>

              <p className="mt-2 text-sm font-semibold text-slate-400">
                Create a subject and link it to a course.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <HeroStat
              label="Courses"
              value={courses.length}
            />

            <HeroStat
              label="Default"
              value="Active"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <SectionHeader
              icon={BookOpen}
              title="Linked course"
              subtitle="Choose where this unit belongs."
            />

            <div className="space-y-4 p-5 sm:p-6">
              <div className="space-y-2">
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
                  value={selectedCourseId}
                  disabled={
                    isPending ||
                    courses.length === 0
                  }
                  onChange={(event) =>
                    setSelectedCourseId(
                      event.target.value,
                    )
                  }
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
                >
                  <option value="">
                    Select course
                  </option>

                  {courses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.code} — {course.title}
                    </option>
                  ))}
                </select>

                {courses.length === 0 ? (
                  <p className="text-xs font-bold text-amber-700">
                    Create a course before adding units.
                  </p>
                ) : null}
              </div>

              {selectedCourse ? (
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-4 sm:grid-cols-2">
                  <PreviewItem
                    icon={GraduationCap}
                    label="Code"
                    value={selectedCourse.code}
                  />

                  <PreviewItem
                    icon={BadgeCheck}
                    label="Category"
                    value={formatEnum(
                      selectedCourse.category,
                    )}
                  />

                  <div className="sm:col-span-2">
                    <PreviewItem
                      icon={BookOpen}
                      label="Course"
                      value={selectedCourse.title}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <SectionHeader
              icon={Layers3}
              title="Unit details"
              subtitle="Code and official title."
            />

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <div className="space-y-2">
                <label
                  htmlFor="code"
                  className="text-xs font-black text-slate-700"
                >
                  Unit code
                </label>

                <div className="relative">
                  <Hash className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

                  <input
                    required
                    type="text"
                    name="code"
                    id="code"
                    disabled={isPending}
                    placeholder="DYN-101"
                    autoComplete="off"
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-4 font-mono text-sm font-black uppercase tracking-wide text-slate-950 outline-none transition-all placeholder:font-semibold placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="text-xs font-black text-slate-700"
                >
                  Unit title
                </label>

                <input
                  required
                  type="text"
                  name="title"
                  id="title"
                  disabled={isPending}
                  placeholder="Dynamic Meteorology"
                  autoComplete="off"
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-bold text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <SectionHeader
              icon={FileText}
              title="Description"
              subtitle="Optional note and availability."
            />

            <div className="space-y-5 p-5 sm:p-6">
              <textarea
                name="description"
                id="description"
                rows={5}
                disabled={isPending}
                placeholder="Briefly describe the unit scope."
                className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-200/60 px-4 py-3 text-sm font-semibold leading-6 text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
              />

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-4">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked
                  disabled={isPending}
                  className="mt-1 h-4 w-4 accent-sky-700 disabled:opacity-60"
                />

                <div>
                  <div className="flex items-center gap-2">
                    <ToggleLeft className="h-4 w-4 text-sky-700" />

                    <p className="text-sm font-black text-slate-950">
                      Active unit
                    </p>
                  </div>

                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Available for future teaching and assessment setup.
                  </p>
                </div>
              </label>
            </div>
          </section>

          <div className="sticky bottom-0 z-20 -mx-3 border-t border-slate-200 bg-slate-50/90 px-3 py-3 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/academic-director/course-units"
                className="inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-black text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={
                  isPending ||
                  courses.length === 0
                }
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
                    Save Unit
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">
                  Unit rules
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Keep units organized.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <GuideItem text="Select the correct course first." />
              <GuideItem text="Use a short recognizable code." />
              <GuideItem text="Codes must be unique within a course." />
            </div>
          </div>
        </aside>
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

function PreviewItem({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>

        <p className="mt-0.5 break-words text-sm font-black text-slate-950">
          {value}
        </p>
      </div>
    </div>
  );
}

function GuideItem({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />

      <p className="text-xs font-bold leading-5 text-slate-600">
        {text}
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
