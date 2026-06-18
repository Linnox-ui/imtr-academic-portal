"use client";
import type { ChangeEvent, ElementType, FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  ClipboardList,
  FileClock,
  GraduationCap,
  History,
  Loader2,
  Save,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import {
  saveDraftResults,
  submitResultsToCoordinator,
} from "@/app/actions/result-entry.actions";
import { Button } from "@/components/ui/button";
type StudentResultRow = {
  id: string;
  admissionNumber: string;
  academicStatus: string;
  enrollmentDate: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
  };
  result: {
    id: string;
    marks: string;
    isAbsent: boolean;
    isExempted: boolean;
    remarks: string;
    createdAt: string;
    updatedAt: string;
    enteredBy: { firstName: string; lastName: string };
    lastEditedBy: { firstName: string; lastName: string } | null;
  } | null;
};
type EditableStudentResult = {
  studentProfileId: string;
  marks: string;
  isAbsent: boolean;
  isExempted: boolean;
  remarks: string;
};
type WorkflowHistoryRecord = {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string;
  comment: string | null;
  createdAt: string;
  performedBy: { firstName: string; lastName: string; role: string };
};
type ResultEntryManagerProps = {
  lecturer: { id: string; name: string; email: string };
  allocation: {
    id: string;
    allocationRole: string;
    intake: {
      id: string;
      code: string;
      title: string;
      year: number;
      status: string;
      course: { id: string; code: string; title: string; category: string };
    };
    unitAssignment: {
      id: string;
      unit: {
        id: string;
        code: string;
        title: string;
        description: string | null;
      };
      semester: {
        id: string;
        title: string;
        semesterNumber: number | null;
        periodType: string;
        courseYear: { id: string; title: string; yearNumber: number };
      };
    };
  };
  assessment: {
    id: string;
    code: string;
    title: string;
    type: string;
    maxMarks: string;
    weightPercent: string | null;
    assessmentDate: string | null;
    createdAt: string;
    createdBy: { firstName: string; lastName: string };
    submission: {
      id: string;
      status: string;
      version: number;
      submittedToCoordinatorAt: string | null;
      coordinatorReviewedAt: string | null;
      coordinatorComment: string | null;
      submittedToAcademicDirectorAt: string | null;
      academicReviewedAt: string | null;
      academicComment: string | null;
      finalApprovedAt: string | null;
      publishedAt: string | null;
    };
  };
  students: StudentResultRow[];
  workflowHistory: WorkflowHistoryRecord[];
};
const EDITABLE_STATUSES = ["DRAFT", "RETURNED_TO_LECTURER"];
export function ResultEntryManager({
  lecturer,
  allocation,
  assessment,
  students,
  workflowHistory,
}: ResultEntryManagerProps) {
  const [rows, setRows] = useState<EditableStudentResult[]>(() =>
    students.map((student) => ({
      studentProfileId: student.id,
      marks: student.result?.marks ?? "",
      isAbsent: student.result?.isAbsent ?? false,
      isExempted: student.result?.isExempted ?? false,
      remarks: student.result?.remarks ?? "",
    })),
  );
  const [isSaving, startSaveTransition] = useTransition();
  const [isSubmitting, startSubmitTransition] = useTransition();
  const router = useRouter();
  const isEditable = EDITABLE_STATUSES.includes(assessment.submission.status);
  const maximumMarks = Number(assessment.maxMarks);
  const rowMap = useMemo(
    () => new Map(rows.map((row) => [row.studentProfileId, row])),
    [rows],
  );
  const completedCount = rows.filter(
    (row) => row.marks.trim() !== "" || row.isAbsent || row.isExempted,
  ).length;
  const marksEnteredCount = rows.filter(
    (row) => row.marks.trim() !== "" && !row.isAbsent && !row.isExempted,
  ).length;
  const absentCount = rows.filter((row) => row.isAbsent).length;
  const exemptedCount = rows.filter((row) => row.isExempted).length;
  const progress =
    students.length > 0
      ? Math.min(100, Math.round((completedCount / students.length) * 100))
      : 0;
  const updateRow = (
    studentProfileId: string,
    changes: Partial<EditableStudentResult>,
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.studentProfileId === studentProfileId
          ? { ...row, ...changes }
          : row,
      ),
    );
  };
  const handleMarksChange = (
    studentProfileId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    updateRow(studentProfileId, { marks: event.target.value });
  };
  const handleAbsentChange = (studentProfileId: string, checked: boolean) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.studentProfileId !== studentProfileId) {
          return row;
        }
        if (checked) {
          return { ...row, marks: "", isAbsent: true, isExempted: false };
        }
        return { ...row, isAbsent: false };
      }),
    );
  };
  const handleExemptedChange = (studentProfileId: string, checked: boolean) => {
    setRows((currentRows) =>
      currentRows.map((row) => {
        if (row.studentProfileId !== studentProfileId) {
          return row;
        }
        if (checked) {
          return { ...row, marks: "", isAbsent: false, isExempted: true };
        }
        return { ...row, isExempted: false };
      }),
    );
  };
  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEditable) {
      toast.error("This result sheet is currently locked.");
      return;
    }
    const invalidRow = rows.find((row) => {
      if (row.isAbsent || row.isExempted || row.marks.trim() === "") {
        return false;
      }
      const mark = Number(row.marks);
      return !Number.isFinite(mark) || mark < 0 || mark > maximumMarks;
    });
    if (invalidRow) {
      const student = students.find(
        (item) => item.id === invalidRow.studentProfileId,
      );
      toast.error(
        `Enter marks between 0 and ${assessment.maxMarks} for ${student?.admissionNumber ?? "the selected student"}.`,
      );
      return;
    }
    const formData = new FormData();
    formData.set("assessmentId", assessment.id);
    formData.set("results", JSON.stringify(rows));
    startSaveTransition(async () => {
      const result = await saveDraftResults(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Draft results saved successfully.");
      router.refresh();
    });
  };
  const handleSubmitToCoordinator = () => {
    if (!isEditable) {
      toast.error("This result sheet is currently locked.");
      return;
    }

    if (students.length === 0) {
      toast.error("This intake has no students.");
      return;
    }

    const incompleteStudent = rows.find(
      (row) => row.marks.trim() === "" && !row.isAbsent && !row.isExempted,
    );

    if (incompleteStudent) {
      const student = students.find(
        (item) => item.id === incompleteStudent.studentProfileId,
      );

      toast.error(
        `${student?.admissionNumber ?? "A student"} has no marks, absence, or exemption recorded.`,
      );

      return;
    }

    const invalidRow = rows.find((row) => {
      if (row.isAbsent || row.isExempted) {
        return false;
      }

      const mark = Number(row.marks);

      return !Number.isFinite(mark) || mark < 0 || mark > maximumMarks;
    });

    if (invalidRow) {
      const student = students.find(
        (item) => item.id === invalidRow.studentProfileId,
      );

      toast.error(
        `Enter marks between 0 and ${assessment.maxMarks} for ${
          student?.admissionNumber ?? "the selected student"
        }.`,
      );

      return;
    }

    const confirmed = window.confirm(
      `Submit ${assessment.code} results for ${allocation.intake.code} to the Course Coordinator?\n\nAfter submission, the result sheet will be locked until it is reviewed.`,
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();

    formData.set("assessmentId", assessment.id);

    startSubmitTransition(async () => {
      const result = await submitResultsToCoordinator(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.message ?? "Results submitted to the Course Coordinator.",
      );

      router.refresh();
    });
  };
  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-5 overflow-hidden">
      {" "}
      <section className="relative isolate overflow-hidden rounded-3xl border border-border bg-primary text-primary-foreground shadow-lg shadow-primary/10">
        {" "}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_48%)]" />{" "}
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          {" "}
          <div className="flex min-w-0 items-start gap-4">
            {" "}
            <Link
              href={`/lecturer/allocations/${allocation.id}/assessments`}
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white/85 transition-all hover:bg-white hover:text-primary"
              aria-label="Back to assessments"
            >
              {" "}
              <ArrowLeft className="h-5 w-5" />{" "}
            </Link>{" "}
            <div className="min-w-0">
              {" "}
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/85">
                {" "}
                <ClipboardList className="h-3.5 w-3.5" />{" "}
                <span>Student Result Sheet</span>{" "}
              </div>{" "}
              <h1 className="break-words text-2xl font-black text-white sm:text-3xl">
                {" "}
                {assessment.title}{" "}
              </h1>{" "}
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/75">
                {" "}
                {`${allocation.unitAssignment.unit.code} — ${allocation.intake.code}`}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="grid grid-cols-2 gap-2">
            {" "}
            <HeroStat title="Students" value={students.length} />{" "}
            <HeroStat title="Complete" value={completedCount} />{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {" "}
        <StatCard
          icon={Users}
          title="Students"
          value={`${students.length}`}
          helper={allocation.intake.code}
        />{" "}
        <StatCard
          icon={ClipboardList}
          title="Marks Entered"
          value={`${marksEnteredCount}`}
          helper={`Maximum ${assessment.maxMarks}`}
        />{" "}
        <StatCard
          icon={UserRound}
          title="Absent"
          value={`${absentCount}`}
          helper="Marked absent"
        />{" "}
        <StatCard
          icon={BadgeCheck}
          title="Exempted"
          value={`${exemptedCount}`}
          helper="Assessment exemptions"
        />{" "}
      </section>{" "}
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        {" "}
        <div className="border-b border-border bg-muted/40 p-5">
          {" "}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {" "}
            <div>
              {" "}
              <h2 className="font-black text-foreground">
                {" "}
                Result Entry Progress{" "}
              </h2>{" "}
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {" "}
                {`${completedCount} of ${students.length} student records completed.`}{" "}
              </p>{" "}
            </div>{" "}
            <WorkflowStatusBadge status={assessment.submission.status} />{" "}
          </div>{" "}
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            {" "}
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />{" "}
          </div>{" "}
        </div>{" "}
        {assessment.submission.coordinatorComment ? (
          <ReviewComment
            title="Coordinator Comment"
            comment={assessment.submission.coordinatorComment}
          />
        ) : null}{" "}
        {assessment.submission.academicComment ? (
          <ReviewComment
            title="Academic Director Comment"
            comment={assessment.submission.academicComment}
          />
        ) : null}{" "}
      </section>{" "}
      <form
        onSubmit={handleSave}
        className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
      >
        {" "}
        <div className="flex flex-col gap-3 border-b border-border bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between">
          {" "}
          <div>
            {" "}
            <h2 className="font-black text-foreground"> Student Marks </h2>{" "}
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {" "}
              Enter marks, absence, exemption and optional remarks.{" "}
            </p>{" "}
          </div>{" "}
          {!isEditable ? (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
              {" "}
              Result Sheet Locked{" "}
            </span>
          ) : null}{" "}
        </div>{" "}
        {students.length === 0 ? (
          <EmptyStudents />
        ) : (
          <>
            {" "}
            <div className="hidden max-w-full overflow-x-auto lg:block">
              {" "}
              <table className="w-full min-w-[1050px] table-fixed text-left text-sm">
                {" "}
                <thead className="border-b border-border bg-muted/30">
                  {" "}
                  <tr>
                    {" "}
                    <th className="w-[17%] px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                      {" "}
                      Admission Number{" "}
                    </th>{" "}
                    <th className="w-[22%] px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                      {" "}
                      Student{" "}
                    </th>{" "}
                    <th className="w-[13%] px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                      {" "}
                      Marks{" "}
                    </th>{" "}
                    <th className="w-[10%] px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-muted-foreground">
                      {" "}
                      Absent{" "}
                    </th>{" "}
                    <th className="w-[10%] px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-muted-foreground">
                      {" "}
                      Exempted{" "}
                    </th>{" "}
                    <th className="w-[28%] px-4 py-3 text-xs font-black uppercase tracking-wider text-muted-foreground">
                      {" "}
                      Remarks{" "}
                    </th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody className="divide-y divide-border">
                  {" "}
                  {students.map((student) => {
                    const row = rowMap.get(student.id);
                    if (!row) {
                      return null;
                    }
                    return (
                      <ResultTableRow
                        key={student.id}
                        student={student}
                        row={row}
                        maximumMarks={assessment.maxMarks}
                        isEditable={isEditable}
                        onMarksChange={handleMarksChange}
                        onAbsentChange={handleAbsentChange}
                        onExemptedChange={handleExemptedChange}
                        onRemarksChange={(value) =>
                          updateRow(student.id, { remarks: value })
                        }
                      />
                    );
                  })}{" "}
                </tbody>{" "}
              </table>{" "}
            </div>{" "}
            <div className="grid gap-3 p-4 lg:hidden">
              {" "}
              {students.map((student) => {
                const row = rowMap.get(student.id);
                if (!row) {
                  return null;
                }
                return (
                  <ResultMobileCard
                    key={student.id}
                    student={student}
                    row={row}
                    maximumMarks={assessment.maxMarks}
                    isEditable={isEditable}
                    onMarksChange={handleMarksChange}
                    onAbsentChange={handleAbsentChange}
                    onExemptedChange={handleExemptedChange}
                    onRemarksChange={(value) =>
                      updateRow(student.id, { remarks: value })
                    }
                  />
                );
              })}{" "}
            </div>{" "}
          </>
        )}{" "}
        <div className="flex flex-col gap-4 border-t border-border bg-muted/30 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black text-foreground">
              Result Sheet Actions
            </p>

            <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
              Save your latest changes before submitting the complete result
              sheet for coordinator review.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              variant="outline"
              disabled={
                !isEditable || isSaving || isSubmitting || students.length === 0
              }
              className="h-11 rounded-2xl px-6 font-black"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Draft...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={handleSubmitToCoordinator}
              disabled={
                !isEditable || isSaving || isSubmitting || students.length === 0
              }
              className="h-11 rounded-2xl px-6 font-black"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileClock className="mr-2 h-4 w-4" />
                  Submit to Coordinator
                </>
              )}
            </Button>
          </div>
        </div>
      </form>{" "}
      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        {" "}
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {" "}
          <div className="border-b border-border bg-muted/40 p-5">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <GraduationCap className="h-5 w-5 text-primary" />{" "}
              <h2 className="font-black text-foreground">
                {" "}
                Assessment Information{" "}
              </h2>{" "}
            </div>{" "}
          </div>{" "}
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {" "}
            <DetailCard
              label="Assessment"
              value={`${assessment.code} — ${assessment.title}`}
            />{" "}
            <DetailCard label="Maximum Marks" value={assessment.maxMarks} />{" "}
            <DetailCard
              label="Weight"
              value={
                assessment.weightPercent
                  ? `${assessment.weightPercent}%`
                  : "Not set"
              }
            />{" "}
            <DetailCard
              label="Course"
              value={`${allocation.intake.course.code} — ${allocation.intake.course.title}`}
            />{" "}
            <DetailCard
              label="Academic Period"
              value={`${allocation.unitAssignment.semester.courseYear.title} — ${allocation.unitAssignment.semester.title}`}
            />{" "}
            <DetailCard label="Lecturer" value={lecturer.name} />{" "}
          </div>{" "}
        </section>{" "}
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {" "}
          <div className="border-b border-border bg-muted/40 p-5">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <History className="h-5 w-5 text-primary" />{" "}
              <h2 className="font-black text-foreground">
                {" "}
                Workflow History{" "}
              </h2>{" "}
            </div>{" "}
          </div>{" "}
          {workflowHistory.length === 0 ? (
            <div className="p-6 text-sm font-semibold text-muted-foreground">
              {" "}
              No workflow history recorded.{" "}
            </div>
          ) : (
            <div className="space-y-3 p-4">
              {" "}
              {workflowHistory.map((history) => (
                <WorkflowHistoryCard key={history.id} history={history} />
              ))}{" "}
            </div>
          )}{" "}
        </section>{" "}
      </section>{" "}
      <section className="rounded-3xl border border-primary/15 bg-primary/5 p-5">
        {" "}
        <div className="flex items-start gap-3">
          {" "}
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />{" "}
          <div>
            {" "}
            <p className="font-black text-foreground">
              {" "}
              Draft-stage controls{" "}
            </p>{" "}
            <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
              {" "}
              Results can only be edited while the sheet is in Draft or Returned
              to Lecturer status. Every changed mark is recorded in the audit
              history.{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
    </div>
  );
}
function ResultTableRow({
  student,
  row,
  maximumMarks,
  isEditable,
  onMarksChange,
  onAbsentChange,
  onExemptedChange,
  onRemarksChange,
}: {
  student: StudentResultRow;
  row: EditableStudentResult;
  maximumMarks: string;
  isEditable: boolean;
  onMarksChange: (
    studentProfileId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onAbsentChange: (studentProfileId: string, checked: boolean) => void;
  onExemptedChange: (studentProfileId: string, checked: boolean) => void;
  onRemarksChange: (value: string) => void;
}) {
  return (
    <tr className="transition-colors hover:bg-muted/20">
      {" "}
      <td className="px-4 py-4 align-top">
        {" "}
        <p className="font-black text-foreground">
          {" "}
          {student.admissionNumber}{" "}
        </p>{" "}
        <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          {" "}
          {formatEnum(student.academicStatus)}{" "}
        </p>{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top">
        {" "}
        <p className="font-black text-foreground">
          {" "}
          {`${student.user.firstName} ${student.user.lastName}`}{" "}
        </p>{" "}
        <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
          {" "}
          {student.user.email}{" "}
        </p>{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top">
        {" "}
        <input
          type="number"
          min="0"
          max={maximumMarks}
          step="0.01"
          value={row.marks}
          disabled={!isEditable || row.isAbsent || row.isExempted}
          onChange={(event) => onMarksChange(student.id, event)}
          placeholder={`0–${maximumMarks}`}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-black outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
        />{" "}
      </td>{" "}
      <td className="px-4 py-4 text-center align-top">
        {" "}
        <input
          type="checkbox"
          checked={row.isAbsent}
          disabled={!isEditable}
          onChange={(event) => onAbsentChange(student.id, event.target.checked)}
          aria-label={`Mark ${student.admissionNumber} absent`}
          className="h-4 w-4 accent-primary"
        />{" "}
      </td>{" "}
      <td className="px-4 py-4 text-center align-top">
        {" "}
        <input
          type="checkbox"
          checked={row.isExempted}
          disabled={!isEditable}
          onChange={(event) =>
            onExemptedChange(student.id, event.target.checked)
          }
          aria-label={`Mark ${student.admissionNumber} exempted`}
          className="h-4 w-4 accent-primary"
        />{" "}
      </td>{" "}
      <td className="px-4 py-4 align-top">
        {" "}
        <input
          type="text"
          value={row.remarks}
          disabled={!isEditable}
          onChange={(event) => onRemarksChange(event.target.value)}
          placeholder="Optional remarks"
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
        />{" "}
      </td>{" "}
    </tr>
  );
}
function ResultMobileCard({
  student,
  row,
  maximumMarks,
  isEditable,
  onMarksChange,
  onAbsentChange,
  onExemptedChange,
  onRemarksChange,
}: {
  student: StudentResultRow;
  row: EditableStudentResult;
  maximumMarks: string;
  isEditable: boolean;
  onMarksChange: (
    studentProfileId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  onAbsentChange: (studentProfileId: string, checked: boolean) => void;
  onExemptedChange: (studentProfileId: string, checked: boolean) => void;
  onRemarksChange: (value: string) => void;
}) {
  return (
    <article className="rounded-3xl border border-border bg-background p-4">
      {" "}
      <div className="flex items-start gap-3">
        {" "}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xs font-black text-primary">
          {" "}
          {`${student.user.firstName.slice(0, 1).toUpperCase()}${student.user.lastName.slice(0, 1).toUpperCase()}`}{" "}
        </div>{" "}
        <div className="min-w-0">
          {" "}
          <p className="break-words font-black text-foreground">
            {" "}
            {`${student.user.firstName} ${student.user.lastName}`}{" "}
          </p>{" "}
          <p className="mt-1 text-xs font-black text-primary">
            {" "}
            {student.admissionNumber}{" "}
          </p>{" "}
        </div>{" "}
      </div>{" "}
      <div className="mt-4 space-y-3">
        {" "}
        <div className="space-y-2">
          {" "}
          <label
            htmlFor={`marks-${student.id}`}
            className="text-xs font-black text-foreground"
          >
            {" "}
            {`Marks / ${maximumMarks}`}{" "}
          </label>{" "}
          <input
            id={`marks-${student.id}`}
            type="number"
            min="0"
            max={maximumMarks}
            step="0.01"
            value={row.marks}
            disabled={!isEditable || row.isAbsent || row.isExempted}
            onChange={(event) => onMarksChange(student.id, event)}
            className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-black outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
          />{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-2">
          {" "}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card p-3">
            {" "}
            <input
              type="checkbox"
              checked={row.isAbsent}
              disabled={!isEditable}
              onChange={(event) =>
                onAbsentChange(student.id, event.target.checked)
              }
              className="h-4 w-4 accent-primary"
            />{" "}
            <span className="text-xs font-black text-foreground">
              {" "}
              Absent{" "}
            </span>{" "}
          </label>{" "}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card p-3">
            {" "}
            <input
              type="checkbox"
              checked={row.isExempted}
              disabled={!isEditable}
              onChange={(event) =>
                onExemptedChange(student.id, event.target.checked)
              }
              className="h-4 w-4 accent-primary"
            />{" "}
            <span className="text-xs font-black text-foreground">
              {" "}
              Exempted{" "}
            </span>{" "}
          </label>{" "}
        </div>{" "}
        <input
          type="text"
          value={row.remarks}
          disabled={!isEditable}
          onChange={(event) => onRemarksChange(event.target.value)}
          placeholder="Optional remarks"
          className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
        />{" "}
      </div>{" "}
    </article>
  );
}
function ReviewComment({ title, comment }: { title: string; comment: string }) {
  return (
    <div className="border-t border-border bg-amber-500/5 p-4">
      {" "}
      <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
        {" "}
        {title}{" "}
      </p>{" "}
      <p className="mt-1 text-sm font-semibold leading-6 text-amber-700">
        {" "}
        {comment}{" "}
      </p>{" "}
    </div>
  );
}
function WorkflowHistoryCard({ history }: { history: WorkflowHistoryRecord }) {
  return (
    <article className="rounded-2xl border border-border bg-background p-4">
      {" "}
      <div className="flex items-start justify-between gap-3">
        {" "}
        <div className="min-w-0">
          {" "}
          <p className="break-words text-sm font-black text-foreground">
            {" "}
            {formatEnum(history.action)}{" "}
          </p>{" "}
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {" "}
            {`${history.performedBy.firstName} ${history.performedBy.lastName}`}{" "}
          </p>{" "}
          <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-primary">
            {" "}
            {formatEnum(history.performedBy.role)}{" "}
          </p>{" "}
        </div>{" "}
        <FileClock className="h-4 w-4 shrink-0 text-primary" />{" "}
      </div>{" "}
      {history.comment ? (
        <p className="mt-3 text-xs font-semibold leading-5 text-muted-foreground">
          {" "}
          {history.comment}{" "}
        </p>
      ) : null}{" "}
      <p className="mt-3 text-[10px] font-bold text-muted-foreground">
        {" "}
        {formatDateTime(history.createdAt)}{" "}
      </p>{" "}
    </article>
  );
}
function WorkflowStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "border-slate-500/20 bg-slate-500/10 text-slate-700",
    SUBMITTED_TO_COORDINATOR: "border-sky-500/20 bg-sky-500/10 text-sky-700",
    RETURNED_TO_LECTURER: "border-amber-500/20 bg-amber-500/10 text-amber-700",
    SUBMITTED_TO_ACADEMIC_DIRECTOR:
      "border-violet-500/20 bg-violet-500/10 text-violet-700",
    RETURNED_TO_COORDINATOR:
      "border-orange-500/20 bg-orange-500/10 text-orange-700",
    FINAL_APPROVED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    PUBLISHED: "border-teal-500/20 bg-teal-500/10 text-teal-700",
    ARCHIVED: "border-zinc-500/20 bg-zinc-500/10 text-zinc-700",
  };
  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${styles[status] ?? "border-border bg-muted text-muted-foreground"}`}
    >
      {" "}
      {formatEnum(status)}{" "}
    </span>
  );
}
function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      {" "}
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        {" "}
        {label}{" "}
      </p>{" "}
      <p className="mt-2 break-words text-sm font-black text-foreground">
        {" "}
        {value}{" "}
      </p>{" "}
    </div>
  );
}
function HeroStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="min-w-[100px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
      {" "}
      <p className="text-xl font-black text-white"> {value} </p>{" "}
      <p className="text-[10px] font-black uppercase tracking-wider text-white/60">
        {" "}
        {title}{" "}
      </p>{" "}
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
      {" "}
      <div className="flex items-start justify-between gap-3">
        {" "}
        <div>
          {" "}
          <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {" "}
            {title}{" "}
          </p>{" "}
          <p className="mt-2 text-2xl font-black text-foreground">
            {" "}
            {value}{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {" "}
          <Icon className="h-5 w-5" />{" "}
        </div>{" "}
      </div>{" "}
      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        {" "}
        {helper}{" "}
      </p>{" "}
    </div>
  );
}
function EmptyStudents() {
  return (
    <div className="px-5 py-14 text-center">
      {" "}
      <Users className="mx-auto h-10 w-10 text-muted-foreground" />{" "}
      <p className="mt-4 text-lg font-black text-foreground">
        {" "}
        No students in this intake{" "}
      </p>{" "}
      <p className="mt-2 text-sm font-semibold text-muted-foreground">
        {" "}
        Students must be admitted to this intake before marks can be
        entered.{" "}
      </p>{" "}
    </div>
  );
}
function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}
