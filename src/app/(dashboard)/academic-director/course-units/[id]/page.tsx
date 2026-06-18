import type { ElementType } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Edit3,
  FileText,
  GraduationCap,
  Hash,
  Layers3,
  ToggleLeft,
} from "lucide-react";

import { prisma } from "@/lib/prisma";

import { CourseUnitStatusControl } from "../course-unit-status-control";

export const dynamic = "force-dynamic";

type CourseUnitProfilePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CourseUnitProfilePage({
  params,
}: CourseUnitProfilePageProps) {
  const { id } = await params;

  const unit = await prisma.courseUnit.findUnique({
    where: {
      id,
    },
    include: {
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          category: true,
          description: true,
        },
      },
    },
  });

  if (!unit) {
    notFound();
  }

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
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
                {unit.code}
              </p>

              <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">
                {unit.title}
              </h1>

              <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-400">
                {unit.course.code} · {unit.course.title}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <CourseUnitStatusControl
              unitId={unit.id}
              unitCode={unit.code}
              unitTitle={unit.title}
              isActive={unit.isActive}
              mode="full"
            />

            <Link
              href={`/academic-director/course-units/${unit.id}/edit`}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-xs font-black text-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Layers3}
          label="Unit"
          value={unit.code}
          helper="Official unit code"
        />

        <StatCard
          icon={BookOpen}
          label="Course"
          value={unit.course.code}
          helper="Linked course"
        />

        <StatCard
          icon={ToggleLeft}
          label="Status"
          value={unit.isActive ? "Active" : "Inactive"}
          helper="Availability"
        />

        <StatCard
          icon={CalendarDays}
          label="Created"
          value={formatDate(unit.createdAt)}
          helper="Record date"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Notes
                </p>

                <h2 className="mt-1 text-lg font-black text-slate-950">
                  Description
                </h2>
              </div>
            </div>

            <p className="mt-5 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-200/50 p-4 text-sm font-semibold leading-7 text-slate-600">
              {unit.description ||
                "No description has been added for this course unit."}
            </p>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <Hash className="h-5 w-5" />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Unit
                </p>

                <h2 className="mt-1 text-lg font-black text-slate-950">
                  Details
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <InfoRow
                label="Unit code"
                value={unit.code}
              />

              <InfoRow
                label="Unit title"
                value={unit.title}
              />

              <InfoRow
                label="Status"
                value={
                  unit.isActive ? "Active" : "Inactive"
                }
              />

              <InfoRow
                label="Updated"
                value={formatDate(unit.updatedAt)}
              />
            </div>
          </section>
        </div>

        <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <BookOpen className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Linked Course
              </p>

              <h2 className="mt-1 text-lg font-black text-slate-950">
                Parent course
              </h2>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-200/50 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 font-mono text-xs font-black text-sky-700">
                {unit.course.code.slice(0, 3).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
                  {unit.course.code}
                </p>

                <h3 className="mt-2 break-words text-lg font-black leading-6 text-slate-950">
                  {unit.course.title}
                </h3>

                <p className="mt-2 text-xs font-bold text-slate-500">
                  {formatEnum(String(unit.course.category))}
                </p>
              </div>
            </div>

            <p className="mt-5 line-clamp-3 rounded-2xl border border-slate-200 bg-slate-100/70 p-4 text-xs font-semibold leading-5 text-slate-500">
              {unit.course.description ||
                "No course description provided."}
            </p>

            <Link
              href={`/academic-director/courses/${unit.course.id}`}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800"
            >
              View Course
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 rounded-2xl bg-slate-900 p-4 text-white">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
              Created
            </p>

            <p className="mt-2 text-sm font-black">
              {formatDate(unit.createdAt)}
            </p>
          </div>
        </section>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/academic-director/course-units"
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-black text-slate-700 transition-all hover:bg-slate-200"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Units
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/academic-director/courses/${unit.course.id}`}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-black text-slate-700 transition-all hover:bg-slate-200"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            View Course
          </Link>

          <Link
            href={`/academic-director/course-units/${unit.id}/edit`}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Unit
          </Link>
        </div>
      </div>
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
  value: string;
  helper: string;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[22px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm duration-500">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>

          <p className="mt-2 truncate text-xl font-black tracking-tight text-slate-950">
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-200/50 p-4">
      <p className="shrink-0 text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="min-w-0 break-words text-right text-sm font-black text-slate-900">
        {value}
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

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}
