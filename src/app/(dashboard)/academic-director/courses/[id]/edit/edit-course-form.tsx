"use client";

import type { FormEvent } from "react";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  Save,
  ShieldCheck,
  Tags,
} from "lucide-react";

import { updateTrainingCourse } from "@/app/actions/student.actions";

type EditCourseFormProps = {
  course: {
    id: string;
    code: string;
    title: string;
    category: string;
    description: string | null;
  };
};

export function EditCourseForm({ course }: EditCourseFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateTrainingCourse(formData);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (result?.success) {
        toast.success(result.message || "Course updated.");
        router.push(`/academic-director/courses/${course.id}`);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href={`/academic-director/courses/${course.id}`}
              aria-label="Back to course profile"
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0 animate-in fade-in slide-in-from-left-3 duration-500">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
                {course.code}
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Edit Course
              </h1>

              <p className="mt-2 text-sm font-semibold text-slate-400">
                Update the official programme record.
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-xs font-black text-slate-300">
            <ShieldCheck className="h-4 w-4 text-amber-300" />
            Edit carefully
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="hidden" name="id" value={course.id} />

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <BookOpen className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">
                  Course details
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Code, category and title.
                </p>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <InputField
                id="code"
                name="code"
                label="Course code"
                defaultValue={course.code}
                required
                uppercase
                disabled={isPending}
              />

              <div className="space-y-2">
                <label
                  htmlFor="category"
                  className="text-xs font-black text-slate-700"
                >
                  Category
                </label>

                <div className="relative">
                  <Tags className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

                  <select
                    required
                    id="category"
                    name="category"
                    defaultValue={course.category}
                    disabled={isPending}
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
                  >
                    <option value="">Select category</option>
                    <option value="DIPLOMA">Diploma</option>
                    <option value="CERTIFICATE">Certificate</option>
                    <option value="SHORT_COURSE">Short Course</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label
                  htmlFor="title"
                  className="text-xs font-black text-slate-700"
                >
                  Course title
                </label>

                <div className="relative">
                  <FileText className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

                  <input
                    required
                    id="title"
                    name="title"
                    type="text"
                    defaultValue={course.title}
                    disabled={isPending}
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-4 text-sm font-bold text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">
                  Description
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Optional short note.
                </p>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={course.description || ""}
                disabled={isPending}
                placeholder="Briefly describe the programme focus."
                className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-200/60 px-4 py-3 text-sm font-semibold leading-6 text-slate-950 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
              />
            </div>
          </section>

          <div className="sticky bottom-0 z-20 -mx-3 border-t border-slate-200 bg-slate-50/90 px-3 py-3 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href={`/academic-director/courses/${course.id}`}
                className="inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-black text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isPending}
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
                    Save Changes
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
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">
                  Edit rules
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Keep records stable.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <GuideItem text="Avoid changing codes after admissions." />
              <GuideItem text="Use clear official titles." />
              <GuideItem text="Category affects reporting." />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function InputField({
  id,
  name,
  label,
  defaultValue,
  required = false,
  uppercase = false,
  disabled = false,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
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

      <input
        required={required}
        id={id}
        name={name}
        type="text"
        defaultValue={defaultValue}
        disabled={disabled}
        className={`h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all placeholder:font-semibold placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60 ${
          uppercase ? "font-mono uppercase tracking-wide" : ""
        }`}
      />
    </div>
  );
}

function GuideItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

      <p className="text-xs font-bold leading-5 text-slate-600">
        {text}
      </p>
    </div>
  );
}
