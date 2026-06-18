import type { ElementType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Layers3,
  MessageSquare,
  Save,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  createAssessment,
  saveDraftResults,
  submitResultsToCoordinator,
} from "./actions";

export const dynamic = "force-dynamic";

type LecturerResultsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const ASSESSMENT_TYPES = [
  ["CAT_1", "CAT 1"],
  ["CAT_2", "CAT 2"],
  ["ASSIGNMENT", "Assignment"],
  ["PRACTICAL", "Practical"],
  ["PROJECT", "Project"],
  ["FINAL_EXAM", "Final Exam"],
  ["OTHER", "Other"],
] as const;

export default async function LecturerResultsPage({
  searchParams,
}: LecturerResultsPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedAllocationId = readParam(params.allocationId);
  const selectedSubmissionId = readParam(params.submissionId);
  const success = readParam(params.success);
  const error = readParam(params.error);

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const lecturer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      accountStatus: true,
      role: { select: { name: true } },
    },
  });

  if (
    !lecturer ||
    !lecturer.isActive ||
    lecturer.accountStatus !== "ACTIVE" ||
    lecturer.role.name !== "lecturer"
  ) {
    redirect("/unauthorized");
  }

  const allocations = await prisma.lecturerUnitAllocation.findMany({
    where: {
      lecturerId: lecturer.id,
      isActive: true,
      unitAssignment: { status: "APPROVED" },
    },
    orderBy: [{ intake: { code: "asc" } }, { createdAt: "asc" }],
    select: {
      id: true,
      allocationRole: true,
      intake: {
        select: {
          id: true,
          code: true,
          title: true,
          assessmentMode: true,
          course: { select: { code: true, title: true } },
        },
      },
      unitAssignment: {
        select: {
          id: true,
          unit: { select: { code: true, title: true } },
          semester: {
            select: {
              title: true,
              courseYear: { select: { title: true } },
            },
          },
        },
      },
      assessments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          title: true,
          type: true,
          maxMarks: true,
          resultSubmission: {
            select: {
              id: true,
              status: true,
              submittedToCoordinatorAt: true,
              coordinatorComment: true,
              academicComment: true,
              publishedAt: true,
              _count: { select: { results: true } },
            },
          },
        },
      },
    },
  });

  const selectedAllocation =
    allocations.find((allocation) => allocation.id === selectedAllocationId) ||
    allocations[0] ||
    null;

  const selectedSubmission = selectedSubmissionId
    ? await prisma.resultSubmission.findFirst({
        where: {
          id: selectedSubmissionId,
          assessment: {
            lecturerAllocation: {
              id: selectedAllocation?.id,
              lecturerId: lecturer.id,
            },
          },
        },
        select: {
          id: true,
          status: true,
          coordinatorComment: true,
          academicComment: true,
          assessment: {
            select: {
              id: true,
              code: true,
              title: true,
              type: true,
              maxMarks: true,
              weightPercent: true,
            },
          },
          results: {
            select: {
              id: true,
              marks: true,
              isAbsent: true,
              isExempted: true,
              remarks: true,
              studentId: true,
            },
          },
        },
      })
    : null;

  const students = selectedAllocation
    ? await prisma.student.findMany({
        where: {
          intakeId: selectedAllocation.intake.id,
          status: "ACTIVE",
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          admissionNumber: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      })
    : [];

  const resultMap = new Map(
    (selectedSubmission?.results || [])
      .filter((result) => result.studentId)
      .map((result) => [result.studentId!, result]),
  );

  const editable = selectedSubmission
    ? ["DRAFT", "RETURNED_TO_LECTURER"].includes(selectedSubmission.status)
    : false;

  const lecturerName =
    [lecturer.firstName, lecturer.lastName].filter(Boolean).join(" ") ||
    lecturer.email;

  const totalSubmissions = allocations.reduce(
    (sum, a) => sum + a.assessments.length,
    0,
  );
  const pendingCoordinator = allocations.reduce(
    (sum, a) =>
      sum +
      a.assessments.filter(
        (ass) => ass.resultSubmission?.status === "SUBMITTED_TO_COORDINATOR",
      ).length,
    0,
  );
  const published = allocations.reduce(
    (sum, a) =>
      sum +
      a.assessments.filter(
        (ass) => ass.resultSubmission?.status === "PUBLISHED",
      ).length,
    0,
  );

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              Lecturer Workspace
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              Results Entry
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              Enter marks for your assigned units and submit them for approval.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex">
            <HeroStat label="Lecturer" value={lecturerName.split(" ")[0]} />
            <HeroStat label="Units" value={allocations.length} />
          </div>
        </div>
      </section>

      {success ? <Notice tone="success" message={success} /> : null}
      {error ? <Notice tone="error" message={error} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Units"
          value={allocations.length}
          helper="Active allocations"
        />
        <StatCard
          icon={FileText}
          label="Sheets"
          value={totalSubmissions}
          helper="Created assessments"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Pending"
          value={pendingCoordinator}
          helper="With coordinator"
        />
        <StatCard
          icon={CheckCircle2}
          label="Published"
          value={published}
          helper="Visible if allowed"
        />
      </section>

      {allocations.length === 0 ? (
        <EmptyState
          title="No allocated units"
          text="Results entry opens after the coordinator allocates you to an approved unit."
        />
      ) : (
        <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
          {/* LEFT SIDEBAR: UNIT SELECTION */}
          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <section className="flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
              <SectionHeader
                icon={Layers3}
                title="My Units"
                subtitle="Select a unit to manage results."
              />
              <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="grid gap-2">
                  {allocations.map((allocation) => {
                    const active = allocation.id === selectedAllocation?.id;
                    return (
                      <Link
                        key={allocation.id}
                        href={`/lecturer/results?allocationId=${allocation.id}`}
                        className={`group block rounded-2xl border p-4 transition-all duration-300 ${
                          active
                            ? "border-sky-300 bg-white shadow-sm ring-1 ring-sky-100"
                            : "border-transparent hover:border-slate-300 hover:bg-slate-200/50"
                        }`}
                      >
                        <p
                          className={`text-[10px] font-black uppercase tracking-wider ${active ? "text-sky-600" : "text-slate-500"}`}
                        >
                          {allocation.intake.code}
                        </p>
                        <p
                          className={`mt-1 text-sm font-black transition-colors ${active ? "text-slate-950" : "text-slate-700 group-hover:text-slate-900"}`}
                        >
                          {allocation.unitAssignment.unit.code}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">
                          {allocation.unitAssignment.unit.title}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>

            {selectedAllocation && (
              <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
                  Selected Unit
                </p>
                <h2 className="mt-2 text-lg font-black tracking-tight">
                  {selectedAllocation.unitAssignment.unit.code}
                </h2>
                <div className="mt-5 space-y-3">
                  <DarkInfo
                    icon={BookOpen}
                    label="Unit"
                    value={selectedAllocation.unitAssignment.unit.title}
                  />
                  <DarkInfo
                    icon={CalendarDays}
                    label="Class"
                    value={selectedAllocation.intake.code}
                  />
                  <DarkInfo
                    icon={GraduationCap}
                    label="Semester"
                    value={`${selectedAllocation.unitAssignment.semester.courseYear.title} · ${selectedAllocation.unitAssignment.semester.title}`}
                  />
                </div>
              </section>
            )}
          </aside>

          {/* MAIN CONTENT AREA */}
          <div className="space-y-5 min-w-0">
            {selectedAllocation && (
              <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
                <SectionHeader
                  icon={ClipboardCheck}
                  title="Result Sheets"
                  subtitle="Open a sheet to enter or review marks."
                />

                {selectedAllocation.assessments.length === 0 ? (
                  <EmptyState
                    title="No result sheets"
                    text="Create the first assessment for this unit below."
                    compact
                  />
                ) : (
                  <div className="divide-y divide-slate-200 px-5 sm:px-6">
                    {selectedAllocation.assessments.map((assessment) => {
                      const submission = assessment.resultSubmission;
                      const active =
                        assessment.resultSubmission?.id ===
                        selectedSubmission?.id;

                      return (
                        <Link
                          key={assessment.id}
                          href={`/lecturer/results?allocationId=${selectedAllocation.id}&submissionId=${submission?.id || ""}`}
                          className={`group flex items-center gap-4 py-4 first:pt-5 last:pb-5 transition-colors ${
                            active
                              ? "bg-slate-200/50 -mx-5 px-5 sm:-mx-6 sm:px-6"
                              : "hover:bg-slate-50/50"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-sky-500 text-white shadow-md" : "bg-sky-100 text-sky-700"}`}
                          >
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-900 group-hover:text-sky-700">
                              {assessment.code} · {assessment.title}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {formatEnum(String(assessment.type))} · Max{" "}
                              {String(assessment.maxMarks)} ·{" "}
                              {submission?._count.results || 0} marked
                            </p>
                          </div>
                          {submission ? (
                            <StatusBadge status={submission.status} />
                          ) : null}
                          <ArrowRight
                            className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${active ? "text-sky-600" : "text-slate-300"}`}
                          />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {selectedSubmission ? (
              <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SectionHeader
                  icon={Users}
                  title={`${selectedSubmission.assessment.code} Marks`}
                  subtitle={`${students.length} active students · ${editable ? "Editable draft" : "Read-only sheet locked for review"}`}
                />

                {/* Reviewer Comments Alert */}
                {(selectedSubmission.coordinatorComment ||
                  selectedSubmission.academicComment) && (
                  <div className="mx-5 mt-5 space-y-3 sm:mx-6">
                    {selectedSubmission.academicComment && (
                      <div className="flex gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                        <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-violet-800">
                            Academic Director Note
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-violet-900">
                            {selectedSubmission.academicComment}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedSubmission.coordinatorComment && (
                      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                        <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                            Coordinator Note
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-amber-900">
                            {selectedSubmission.coordinatorComment}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fix 2 & 3: action={saveDraftResults as any} & Marks (/{String(...)}) */}
                <form action={saveDraftResults as any} className="p-5 sm:p-6">
                  <input
                    type="hidden"
                    name="submissionId"
                    value={selectedSubmission.id}
                  />

                  <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Student</th>
                          <th className="px-5 py-4">
                            Marks (/
                            {String(selectedSubmission.assessment.maxMarks)})
                          </th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {students.map((student) => {
                          const result = resultMap.get(student.id);
                          const status = result?.isExempted
                            ? "EXEMPTED"
                            : result?.isAbsent
                              ? "ABSENT"
                              : "MARKED";

                          return (
                            <tr
                              key={student.id}
                              className="transition-colors hover:bg-slate-50/80"
                            >
                              <td className="px-5 py-3">
                                <p className="font-black text-slate-900">
                                  {student.firstName} {student.lastName}
                                </p>
                                <p className="mt-0.5 font-mono text-xs font-semibold text-slate-500">
                                  {student.admissionNumber}
                                </p>
                              </td>
                              <td className="px-5 py-3">
                                <input
                                  name={`marks_${student.id}`}
                                  type="number"
                                  min="0"
                                  max={Number(
                                    selectedSubmission.assessment.maxMarks,
                                  )}
                                  step="0.01"
                                  defaultValue={
                                    result?.marks === null ||
                                    result?.marks === undefined
                                      ? ""
                                      : String(result.marks)
                                  }
                                  disabled={!editable}
                                  placeholder="-"
                                  className="h-10 w-28 rounded-xl border border-slate-300 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                />
                              </td>
                              <td className="px-5 py-3">
                                <select
                                  name={`status_${student.id}`}
                                  defaultValue={status}
                                  disabled={!editable}
                                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-900 outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                >
                                  <option value="MARKED">Marked</option>
                                  <option value="ABSENT">Absent</option>
                                  <option value="EXEMPTED">Exempted</option>
                                </select>
                              </td>
                              <td className="px-5 py-3">
                                <input
                                  name={`remarks_${student.id}`}
                                  defaultValue={result?.remarks || ""}
                                  disabled={!editable}
                                  placeholder="Optional note"
                                  className="h-10 w-48 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <input
                      name="reason"
                      placeholder="Optional edit note / log reason"
                      disabled={!editable}
                      className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-bold text-slate-950 outline-none focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={!editable}
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-black text-white transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </button>
                  </div>
                </form>

                {editable ? (
                  /* Fix 4: action={submitResultsToCoordinator as any} */
                  <form
                    action={submitResultsToCoordinator as any}
                    className="border-t border-slate-200 bg-slate-200/30 p-5 sm:p-6"
                  >
                    <input
                      type="hidden"
                      name="submissionId"
                      value={selectedSubmission.id}
                    />
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <input
                        name="comment"
                        placeholder="Submission note to coordinator (Optional)"
                        className="h-12 w-full rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                      />
                      <button
                        type="submit"
                        className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white shadow-lg shadow-emerald-900/10 transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Submit for Approval
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="border-t border-slate-200 bg-slate-200/30 p-5 sm:p-6">
                    <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                      <ShieldCheck className="h-5 w-5 shrink-0 text-sky-600" />
                      <p className="text-xs font-bold leading-5 text-sky-800">
                        This result sheet is locked because it has been
                        submitted for review. It cannot be edited unless
                        returned by the coordinator.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            {selectedAllocation && !selectedSubmission ? (
              <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SectionHeader
                  icon={FileText}
                  title="Create Assessment"
                  subtitle="Create a new CAT, assignment, practical or exam sheet."
                />

                {/* Fix 5: action={createAssessment as any} */}
                <form
                  action={createAssessment as any}
                  className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
                >
                  <input
                    type="hidden"
                    name="allocationId"
                    value={selectedAllocation.id}
                  />

                  <InputField
                    label="Assessment Code"
                    name="code"
                    placeholder="e.g., CAT1"
                    required
                  />
                  <InputField
                    label="Assessment Title"
                    name="title"
                    placeholder="e.g., Continuous Assessment 1"
                    required
                  />

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">
                      Assessment Type
                    </label>
                    <select
                      name="type"
                      defaultValue="CAT_1"
                      className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
                    >
                      {ASSESSMENT_TYPES.filter(([value]) =>
                        selectedAllocation.intake.assessmentMode === "NO_EXAM"
                          ? value !== "FINAL_EXAM"
                          : true,
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <InputField
                    label="Maximum Marks"
                    name="maxMarks"
                    type="number"
                    min="1"
                    defaultValue="30"
                    required
                  />
                  <InputField
                    label="Weight % (Optional)"
                    name="weightPercent"
                    type="number"
                    min="0"
                    placeholder="e.g., 30"
                  />
                  <InputField
                    label="Administered Date"
                    name="assessmentDate"
                    type="date"
                  />

                  <div className="sm:col-span-2 pt-2">
                    <button
                      type="submit"
                      className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-2xl bg-slate-900 px-8 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800"
                    >
                      <FileText className="mr-2 h-5 w-5" />
                      Create Blank Result Sheet
                    </button>
                  </div>
                </form>
              </section>
            ) : null}
          </div>
        </section>
      )}
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
    <div className="animate-in fade-in slide-in-from-bottom-2 rounded-[22px] border border-slate-200 bg-slate-100/80 p-4 shadow-sm duration-500">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-[11px] font-bold text-slate-500">{helper}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-[112px] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center backdrop-blur">
      <p className="truncate text-sm font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>
    </div>
  );
}

function DarkInfo({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-1 break-words text-xs font-black text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function InputField({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  min,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  defaultValue?: string;
  min?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-black text-slate-700">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={min}
        required={required}
        className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none placeholder:font-semibold placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "border-slate-200 bg-slate-100 text-slate-700",
    SUBMITTED_TO_COORDINATOR: "border-sky-200 bg-sky-100 text-sky-700",
    RETURNED_TO_LECTURER: "border-amber-200 bg-amber-100 text-amber-700",
    SUBMITTED_TO_ACADEMIC_DIRECTOR:
      "border-violet-200 bg-violet-100 text-violet-700",
    FINAL_APPROVED: "border-emerald-200 bg-emerald-100 text-emerald-700",
    PUBLISHED: "border-emerald-200 bg-emerald-100 text-emerald-700",
  };

  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${styles[status] ?? "border-slate-200 bg-slate-100 text-slate-700"}`}
    >
      {formatEnum(status)}
    </span>
  );
}

function Notice({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-bold ${styles}`}>
      {message}
    </div>
  );
}

function EmptyState({
  title,
  text,
  compact = false,
}: {
  title: string;
  text: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`${compact ? "m-5 min-h-40" : "min-h-72"} flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-200/40 px-5 text-center sm:m-6`}
    >
      <ClipboardCheck className="h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm font-black text-slate-700">{title}</p>
      <p className="mt-1 max-w-md text-xs font-semibold leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
