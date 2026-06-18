import type { ElementType } from "react";

import { redirect } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StudentResultsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      accountStatus: true,
      role: { select: { name: true } },
      studentProfile: {
        select: {
          id: true,
          admissionNumber: true,
          academicStatus: true,
          intake: {
            select: {
              id: true,
              code: true,
              title: true,
              year: true,
              course: { select: { code: true, title: true } },
            },
          },
        },
      },
    },
  });

  if (
    !currentUser ||
    !currentUser.isActive ||
    currentUser.accountStatus !== "ACTIVE" ||
    currentUser.role.name !== "student"
  ) {
    redirect("/unauthorized");
  }

  const registryStudent = await prisma.student.findFirst({
    where: { email: currentUser.email },
    select: {
      id: true,
      admissionNumber: true,
      status: true,
      intake: {
        select: {
          id: true,
          code: true,
          title: true,
          year: true,
          course: { select: { code: true, title: true } },
        },
      },
    },
  });

  const intake = currentUser.studentProfile?.intake ?? registryStudent?.intake ?? null;
  const admissionNumber = currentUser.studentProfile?.admissionNumber ?? registryStudent?.admissionNumber ?? "Not linked";
  const academicStatus = currentUser.studentProfile?.academicStatus ?? registryStudent?.status ?? "ACTIVE";
  const studentName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ") || currentUser.email;

  const whereOr = [] as any[];

  if (registryStudent?.id) {
    whereOr.push({ studentId: registryStudent.id });
  }

  if (currentUser.studentProfile?.id) {
    whereOr.push({ studentProfileId: currentUser.studentProfile.id });
  }

  const results = whereOr.length
    ? await prisma.studentAssessmentResult.findMany({
        where: {
          OR: whereOr,
          submission: {
            status: "PUBLISHED",
            assessment: {
              type: { in: ["CAT_1", "CAT_2"] },
            },
          },
        },
        orderBy: [
          { submission: { assessment: { unitAssignment: { semester: { courseYear: { sequence: "asc" } } } } } } as any,
          { submission: { assessment: { unitAssignment: { semester: { sequence: "asc" } } } } } as any,
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          marks: true,
          isAbsent: true,
          isExempted: true,
          remarks: true,
          submission: {
            select: {
              publishedAt: true,
              assessment: {
                select: {
                  code: true,
                  title: true,
                  type: true,
                  maxMarks: true,
                  weightPercent: true,
                  unitAssignment: {
                    select: {
                      unit: { select: { code: true, title: true } },
                      semester: {
                        select: {
                          title: true,
                          courseYear: { select: { title: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })
    : [];

  const cat1Count = results.filter((result) => result.submission.assessment.type === "CAT_1").length;
  const cat2Count = results.filter((result) => result.submission.assessment.type === "CAT_2").length;
  const markedCount = results.filter((result) => !result.isAbsent && !result.isExempted && result.marks !== null).length;

  if (!intake) {
    return <NoIntakeLinked studentName={studentName} email={currentUser.email} />;
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Student Portal
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              My Results
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              Published CAT 1 and CAT 2 results for your class.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <HeroStat label="Student" value={studentName} />
            <HeroStat label="Admission" value={admissionNumber} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Published" value={results.length} helper="CAT result sheets" />
        <StatCard icon={BookOpen} label="CAT 1" value={cat1Count} helper="Published CAT 1" />
        <StatCard icon={ClipboardIcon} label="CAT 2" value={cat2Count} helper="Published CAT 2" />
        <StatCard icon={CheckCircle2} label="Marked" value={markedCount} helper="With marks" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
          <SectionHeader icon={FileText} title="Published CAT Results" subtitle="Main exam results remain hidden until final release." />

          {results.length === 0 ? (
            <EmptyState title="No published CAT results" text="Your CAT 1 and CAT 2 results will appear after Academic Director publication." />
          ) : (
            <div className="grid gap-4 p-5 sm:p-6">
              {results.map((result) => {
                const assessment = result.submission.assessment;
                const displayMarks = result.isExempted
                  ? "Exempted"
                  : result.isAbsent
                    ? "Absent"
                    : result.marks === null
                      ? "Pending"
                      : `${String(result.marks)} / ${String(assessment.maxMarks)}`;

                return (
                  <div key={result.id} className="rounded-[24px] border border-slate-200 bg-slate-200/50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={String(assessment.type)} />
                          <p className="text-sm font-black text-slate-950">{assessment.code} · {assessment.title}</p>
                        </div>
                        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                          {assessment.unitAssignment.unit.code} · {assessment.unitAssignment.unit.title}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                          {assessment.unitAssignment.semester.courseYear.title} · {assessment.unitAssignment.semester.title}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-center">
                        <p className="text-[9px] font-black uppercase tracking-wider text-sky-700">Score</p>
                        <p className="mt-1 text-lg font-black text-slate-950">{displayMarks}</p>
                      </div>
                    </div>

                    {result.remarks ? (
                      <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-100 p-3 text-xs font-bold text-slate-600">
                        {result.remarks}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-950">Visibility Rule</h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">Only approved CATs are shown.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <GuideItem text="Students see CAT 1 and CAT 2 only." />
              <GuideItem text="Final exam results remain hidden until final release." />
              <GuideItem text="Results appear after Academic Director publication." />
            </div>
          </section>

          <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">Class</p>
            <h2 className="mt-2 text-lg font-black tracking-tight">{intake.code}</h2>
            <div className="mt-5 space-y-3">
              <DarkInfo icon={CalendarDays} label="Intake" value={`${intake.title} · ${intake.year}`} />
              <DarkInfo icon={BookOpen} label="Course" value={`${intake.course.code} — ${intake.course.title}`} />
              <DarkInfo icon={GraduationCap} label="Status" value={formatEnum(academicStatus)} />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

const ClipboardIcon = FileText;

function NoIntakeLinked({ studentName, email }: { studentName: string; email: string }) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">Student Portal</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">No Intake Linked</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
          {studentName} ({email}) is not linked to an intake yet.
        </p>
      </section>
      <EmptyState title="Results unavailable" text="Ask Academic Director or Registry to link this student account to an intake." />
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: ElementType; title: string; subtitle: string }) {
  return <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 sm:px-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><Icon className="h-5 w-5" /></div><div className="min-w-0"><h2 className="truncate text-base font-black text-slate-950">{title}</h2><p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{subtitle}</p></div></div>;
}
function StatCard({ icon: Icon, label, value, helper }: { icon: ElementType; label: string; value: string | number; helper: string }) { return <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[22px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm duration-500"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p><p className="mt-1 text-[11px] font-bold text-slate-500">{helper}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><Icon className="h-5 w-5" /></div></div></div>; }
function HeroStat({ label, value }: { label: string; value: string | number }) { return <div className="min-w-[112px] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center"><p className="truncate text-sm font-black text-white">{value}</p><p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p></div>; }
function DarkInfo({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) { return <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-300"><Icon className="h-4 w-4" /></div><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words text-xs font-black text-white">{value}</p></div></div>; }
function GuideItem({ text }: { text: string }) { return <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><p className="text-xs font-bold leading-5 text-slate-600">{text}</p></div>; }
function StatusBadge({ status }: { status: string }) { const styles: Record<string, string> = { CAT_1: "bg-sky-100 text-sky-700", CAT_2: "bg-emerald-100 text-emerald-700" }; return <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${styles[status] ?? "bg-slate-200 text-slate-700"}`}>{formatEnum(status)}</span>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="m-5 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center sm:m-6"><Users className="h-8 w-8 text-slate-400" /><p className="mt-3 text-sm font-black text-slate-700">{title}</p><p className="mt-1 max-w-sm text-xs font-semibold leading-5 text-slate-500">{text}</p></div>; }
function formatEnum(value: string) { return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()); }
