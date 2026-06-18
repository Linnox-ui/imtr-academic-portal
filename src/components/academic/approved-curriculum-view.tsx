import Link from 'next/link';
import type { ElementType } from 'react';

import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  GraduationCap,
  Layers3,
  Sparkles,
} from 'lucide-react';

import type { ApprovedCourseCurriculum } from '@/lib/approved-curriculum';

type ApprovedCurriculumViewProps = {
  course: ApprovedCourseCurriculum;
  audience: 'LECTURER' | 'STUDENT';
  backHref: string;
};

export function ApprovedCurriculumView({
  course,
  audience,
  backHref,
}: ApprovedCurriculumViewProps) {
  const totalSemesters = course.years.reduce(
    (total, year) => total + year.semesters.length,
    0,
  );

  const totalUnits = course.years.reduce(
    (yearTotal, year) =>
      yearTotal +
      year.semesters.reduce(
        (semesterTotal, semester) =>
          semesterTotal + semester.units.length,
        0,
      ),
    0,
  );

  const audienceLabel =
    audience === 'LECTURER'
      ? 'Lecturer Curriculum'
      : 'Student Curriculum';

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-5 overflow-hidden">
      <section className="relative isolate overflow-hidden rounded-3xl border border-border bg-primary text-primary-foreground shadow-lg shadow-primary/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_48%)]" />
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent/25 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href={backHref}
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white/85 transition-all hover:bg-white hover:text-primary"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0">
              <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/85">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{audienceLabel}</span>
              </div>

              <h1 className="break-words text-2xl font-black text-white sm:text-3xl lg:text-4xl">
                {course.title}
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/75">
                Approved academic years, semesters, training blocks, and
                course units.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <HeroStat title="Periods" value={totalSemesters} />
            <HeroStat title="Units" value={totalUnits} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          title="Course Code"
          value={course.code}
          helper={formatEnum(course.category)}
        />

        <StatCard
          icon={GraduationCap}
          title="Academic Years"
          value={`${course.years.length}`}
          helper="Approved structure"
        />

        <StatCard
          icon={CalendarRange}
          title="Academic Periods"
          value={`${totalSemesters}`}
          helper="Visible semesters and blocks"
        />

        <StatCard
          icon={Layers3}
          title="Approved Units"
          value={`${totalUnits}`}
          helper="Visible curriculum units"
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700">
              <BadgeCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-black text-foreground">
                Approved Course Structure
              </h2>

              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Only Academic Director-approved units are displayed.
              </p>
            </div>
          </div>
        </div>

        {course.years.length === 0 ? (
          <EmptyApprovedCurriculum />
        ) : (
          <div className="space-y-5 p-4 sm:p-6">
            {course.years.map((year) => (
              <article
                key={year.id}
                className="overflow-hidden rounded-3xl border border-border bg-background"
              >
                <div className="border-b border-border bg-muted/40 p-4 sm:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <GraduationCap className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="break-words text-base font-black text-foreground">
                        {year.title}
                      </h3>

                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {year.semesters.length} approved academic period
                        {year.semesters.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-4 xl:grid-cols-2">
                  {year.semesters.map((semester) => (
                    <section
                      key={semester.id}
                      className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/30 p-4">
                        <div className="min-w-0">
                          <h4 className="break-words font-black text-foreground">
                            {semester.title}
                          </h4>

                          <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-primary">
                            {formatEnum(semester.periodType)}
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                          {semester.units.length} Approved
                        </span>
                      </div>

                      <div className="space-y-3 p-4">
                        {semester.units.map((unit) => (
                          <div
                            key={unit.assignmentId}
                            className="relative overflow-hidden rounded-2xl border border-border bg-background p-4"
                          >
                            <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />

                            <div className="min-w-0 pl-2">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 px-1 text-center text-[10px] font-black text-primary">
                                  {unit.code.slice(0, 5)}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="break-words text-sm font-black text-foreground">
                                    {unit.title}
                                  </p>

                                  <p className="mt-1 text-xs font-black uppercase tracking-wider text-primary">
                                    {unit.code}
                                  </p>
                                </div>

                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                              </div>

                              <p className="mt-3 text-xs font-semibold leading-5 text-muted-foreground">
                                {unit.description ||
                                  'No unit description provided.'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

          <div>
            <p className="font-black text-emerald-800">
              Approved curriculum only
            </p>

            <p className="mt-1 text-sm font-semibold leading-6 text-emerald-700">
              Draft, submitted, rejected, archived, and
              amendment-requested unit assignments are excluded from this
              page.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="min-w-[100px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
      <p className="text-xl font-black text-white">{value}</p>

      <p className="text-[10px] font-black uppercase tracking-wider text-white/60">
        {title}
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  helper,
}: {
  icon: ElementType;
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {title}
          </p>

          <p className="mt-2 break-words text-2xl font-black text-foreground">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        {helper}
      </p>
    </div>
  );
}

function EmptyApprovedCurriculum() {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-muted text-muted-foreground">
        <Layers3 className="h-10 w-10" />
      </div>

      <p className="mt-5 text-xl font-black text-foreground">
        No approved curriculum available
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
        Approved semester-unit assignments will appear here after Academic
        Director review.
      </p>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}