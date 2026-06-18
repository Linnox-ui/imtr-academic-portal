"use client";
import type { ElementType, FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarRange,
  History,
  Layers3,
  Loader2,
  Mail,
  Plus,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import {
  assignLecturerToUnit,
  endLecturerAllocation,
} from "@/app/actions/lecturer-allocation.actions";
import { Button } from "@/components/ui/button";
type IntakeOption = {
  id: string;
  code: string;
  title: string;
  year: number;
  status: string;
};
type ApprovedAssignment = {
  id: string;
  reviewedAt: string | null;
  unit: { id: string; code: string; title: string };
  semester: {
    id: string;
    title: string;
    periodType: string;
    courseYear: {
      id: string;
      title: string;
      yearNumber: number;
      sequence: number;
    };
  };
};
type LecturerOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};
type AllocationRecord = {
  id: string;
  allocationRole: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
  changeReason: string | null;
  intake: { id: string; code: string; title: string; year: number };
  lecturer: { id: string; firstName: string; lastName: string; email: string };
  allocatedBy: { firstName: string; lastName: string };
  endedBy: { firstName: string; lastName: string } | null;
  unitAssignment: {
    id: string;
    unit: { id: string; code: string; title: string };
    semester: {
      id: string;
      title: string;
      courseYear: { id: string; title: string };
    };
  };
};
type LecturerAllocationManagerProps = {
  course: { id: string; code: string; title: string; category: string };
  intakes: IntakeOption[];
  approvedAssignments: ApprovedAssignment[];
  lecturers: LecturerOption[];
  allocations: AllocationRecord[];
};
export function LecturerAllocationManager({
  course,
  intakes,
  approvedAssignments,
  lecturers,
  allocations,
}: LecturerAllocationManagerProps) {
  const [selectedIntakeId, setSelectedIntakeId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedLecturerId, setSelectedLecturerId] = useState("");
  const [allocationRole, setAllocationRole] = useState("PRIMARY");
  const [isAssigning, startAssignTransition] = useTransition();
  const [isEnding, startEndTransition] = useTransition();
  const router = useRouter();
  const activeAllocations = allocations.filter(
    (allocation) => allocation.isActive,
  );
  const historicalAllocations = allocations.filter(
    (allocation) => !allocation.isActive,
  );
  const selectedIntake = intakes.find(
    (intake) => intake.id === selectedIntakeId,
  );
  const selectedAssignment = approvedAssignments.find(
    (assignment) => assignment.id === selectedAssignmentId,
  );
  const selectedLecturer = lecturers.find(
    (lecturer) => lecturer.id === selectedLecturerId,
  );
  const activeForSelection = useMemo(
    () =>
      allocations.filter(
        (allocation) =>
          allocation.isActive &&
          allocation.intake.id === selectedIntakeId &&
          allocation.unitAssignment.id === selectedAssignmentId,
      ),
    [allocations, selectedIntakeId, selectedAssignmentId],
  );
  const existingPrimary =
    allocationRole === "PRIMARY"
      ? activeForSelection.find(
          (allocation) => allocation.allocationRole === "PRIMARY",
        )
      : undefined;
  const activeLecturerIds = new Set(
    activeForSelection.map((allocation) => allocation.lecturer.id),
  );
  const availableLecturers = lecturers.filter(
    (lecturer) => !activeLecturerIds.has(lecturer.id),
  );
  const handleAssign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startAssignTransition(async () => {
      const result = await assignLecturerToUnit(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message || "Lecturer allocated successfully.");
      form.reset();
      setSelectedIntakeId("");
      setSelectedAssignmentId("");
      setSelectedLecturerId("");
      setAllocationRole("PRIMARY");
      router.refresh();
    });
  };
  const handleEndAllocation = (allocation: AllocationRecord) => {
    const reason = window.prompt(
      `Enter the reason for ending ${allocation.lecturer.firstName} ${allocation.lecturer.lastName}'s allocation for ${allocation.unitAssignment.unit.code}:`,
    );
    if (reason === null) {
      return;
    }
    if (!reason.trim()) {
      toast.error("A reason is required when ending an allocation.");
      return;
    }
    const confirmed = window.confirm(
      `End this lecturer allocation?\n\nLecturer: ${allocation.lecturer.firstName} ${allocation.lecturer.lastName}\nIntake: ${allocation.intake.code}\nUnit: ${allocation.unitAssignment.unit.code}`,
    );
    if (!confirmed) {
      return;
    }
    const formData = new FormData();
    formData.set("allocationId", allocation.id);
    formData.set("reason", reason.trim());
    startEndTransition(async () => {
      const result = await endLecturerAllocation(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.message || "Lecturer allocation ended successfully.",
      );
      router.refresh();
    });
  };
  const missingRequirements = [
    intakes.length === 0 ? "No intake has been created for this course." : null,
    approvedAssignments.length === 0
      ? "No approved semester units are available."
      : null,
    lecturers.length === 0
      ? "No active lecturer accounts are available."
      : null,
  ].filter((message): message is string => Boolean(message));
  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-5 overflow-hidden">
      {" "}
      <section className="relative isolate min-w-0 overflow-hidden rounded-3xl border border-border bg-primary text-primary-foreground shadow-lg shadow-primary/10">
        {" "}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_48%)]" />{" "}
        <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-accent/25 blur-3xl" />{" "}
        <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-secondary/30 blur-3xl" />{" "}
        <div className="relative flex min-w-0 flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          {" "}
          <div className="flex min-w-0 items-start gap-4">
            {" "}
            <Link
              href={`/coordinator/courses/${course.id}/unit-assignments`}
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white/85 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:text-primary"
              aria-label="Back to unit assignments"
            >
              {" "}
              <ArrowLeft className="h-5 w-5" />{" "}
            </Link>{" "}
            <div className="min-w-0">
              {" "}
              <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/85 backdrop-blur">
                {" "}
                <Sparkles className="h-3.5 w-3.5 shrink-0" />{" "}
                <span className="truncate"> Teaching Allocation </span>{" "}
              </div>{" "}
              <h1 className="break-words text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                {" "}
                {course.title}{" "}
              </h1>{" "}
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/75">
                {" "}
                Assign lecturers to approved units for specific intakes and
                preserve all teaching allocation history.{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {" "}
            <HeroStat title="Active" value={activeAllocations.length} />{" "}
            <HeroStat
              title="History"
              value={historicalAllocations.length}
            />{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {" "}
        <StatCard
          icon={CalendarRange}
          title="Course Intakes"
          value={`${intakes.length}`}
          helper="Available cohorts"
        />{" "}
        <StatCard
          icon={Layers3}
          title="Approved Units"
          value={`${approvedAssignments.length}`}
          helper="Eligible for allocation"
        />{" "}
        <StatCard
          icon={Users}
          title="Lecturers"
          value={`${lecturers.length}`}
          helper="Active lecturer accounts"
        />{" "}
        <StatCard
          icon={UserCheck}
          title="Active Allocations"
          value={`${activeAllocations.length}`}
          helper="Current teaching duties"
        />{" "}
      </section>{" "}
      <section className="grid min-w-0 gap-5 xl:grid-cols-[420px_1fr]">
        {" "}
        <form
          onSubmit={handleAssign}
          className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card shadow-sm xl:sticky xl:top-24 xl:self-start"
        >
          {" "}
          <div className="border-b border-border bg-muted/40 p-5">
            {" "}
            <div className="flex min-w-0 items-center gap-3">
              {" "}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {" "}
                <UserCheck className="h-5 w-5" />{" "}
              </div>{" "}
              <div className="min-w-0">
                {" "}
                <h2 className="truncate font-black text-foreground">
                  {" "}
                  Allocate Lecturer{" "}
                </h2>{" "}
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {" "}
                  Only approved units can be allocated.{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div className="space-y-4 p-5">
            {" "}
            <input type="hidden" name="courseId" value={course.id} />{" "}
            {missingRequirements.length > 0 ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                {" "}
                <p className="text-sm font-black text-amber-800">
                  {" "}
                  Allocation requirements incomplete{" "}
                </p>{" "}
                <div className="mt-2 space-y-1">
                  {" "}
                  {missingRequirements.map((message) => (
                    <p
                      key={message}
                      className="text-xs font-semibold leading-5 text-amber-700"
                    >
                      {" "}
                      • {message}{" "}
                    </p>
                  ))}{" "}
                </div>{" "}
              </div>
            ) : null}{" "}
            <SelectField
              name="intakeId"
              label="Course Intake"
              value={selectedIntakeId}
              onChange={setSelectedIntakeId}
              placeholder="Select intake..."
              disabled={intakes.length === 0}
              options={intakes.map((intake) => ({
                value: intake.id,
                label: `${intake.code} — ${intake.title} (${intake.year}) — ${formatEnum(intake.status)}`,
              }))}
            />{" "}
            <SelectField
              name="unitAssignmentId"
              label="Approved Unit"
              value={selectedAssignmentId}
              onChange={setSelectedAssignmentId}
              placeholder="Select approved unit..."
              disabled={approvedAssignments.length === 0}
              options={approvedAssignments.map((assignment) => ({
                value: assignment.id,
                label: `${assignment.semester.courseYear.title} — ${assignment.semester.title} | ${assignment.unit.code} — ${assignment.unit.title}`,
              }))}
            />{" "}
            <SelectField
              name="allocationRole"
              label="Teaching Role"
              value={allocationRole}
              onChange={setAllocationRole}
              placeholder="Select teaching role..."
              options={[
                { value: "PRIMARY", label: "Primary Lecturer" },
                { value: "CO_LECTURER", label: "Co-Lecturer" },
                { value: "ASSISTANT", label: "Assistant Lecturer" },
              ]}
            />{" "}
            <SelectField
              name="lecturerId"
              label="Lecturer"
              value={selectedLecturerId}
              onChange={setSelectedLecturerId}
              placeholder={
                availableLecturers.length === 0
                  ? "No available lecturer"
                  : "Select lecturer..."
              }
              disabled={
                lecturers.length === 0 || availableLecturers.length === 0
              }
              options={availableLecturers.map((lecturer) => ({
                value: lecturer.id,
                label: `${lecturer.firstName} ${lecturer.lastName} — ${lecturer.email}`,
              }))}
            />{" "}
            {existingPrimary ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                {" "}
                <p className="text-sm font-black text-amber-800">
                  {" "}
                  Switching Primary Lecturer{" "}
                </p>{" "}
                <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                  {" "}
                  The current primary lecturer is{" "}
                  {existingPrimary.lecturer.firstName}{" "}
                  {existingPrimary.lecturer.lastName} . Saving this allocation
                  will end their current assignment and move it to history.{" "}
                </p>{" "}
              </div>
            ) : null}{" "}
            <div className="space-y-2">
              {" "}
              <label
                htmlFor="changeReason"
                className="text-sm font-black text-foreground/80"
              >
                {" "}
                {existingPrimary ? "Switching Reason" : "Allocation Note"}{" "}
                {existingPrimary ? (
                  <span className="text-destructive"> * </span>
                ) : null}{" "}
              </label>{" "}
              <textarea
                id="changeReason"
                name="changeReason"
                required={Boolean(existingPrimary)}
                rows={4}
                placeholder={
                  existingPrimary
                    ? "Explain why the primary lecturer is being changed..."
                    : "Optional note about this allocation..."
                }
                className="w-full min-w-0 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm font-semibold leading-6 text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
              />{" "}
            </div>{" "}
            {selectedIntake && selectedAssignment ? (
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <BadgeCheck className="h-4 w-4 text-primary" />{" "}
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                    {" "}
                    Allocation Preview{" "}
                  </p>{" "}
                </div>{" "}
                <div className="mt-3 space-y-2">
                  {" "}
                  <PreviewRow
                    label="Intake"
                    value={`${selectedIntake.code} — ${selectedIntake.title}`}
                  />{" "}
                  <PreviewRow
                    label="Period"
                    value={`${selectedAssignment.semester.courseYear.title} — ${selectedAssignment.semester.title}`}
                  />{" "}
                  <PreviewRow
                    label="Unit"
                    value={`${selectedAssignment.unit.code} — ${selectedAssignment.unit.title}`}
                  />{" "}
                  <PreviewRow label="Role" value={formatEnum(allocationRole)} />{" "}
                  {selectedLecturer ? (
                    <PreviewRow
                      label="Lecturer"
                      value={`${selectedLecturer.firstName} ${selectedLecturer.lastName}`}
                    />
                  ) : null}{" "}
                </div>{" "}
              </div>
            ) : null}{" "}
            <Button
              type="submit"
              disabled={
                isAssigning ||
                intakes.length === 0 ||
                approvedAssignments.length === 0 ||
                lecturers.length === 0 ||
                !selectedIntakeId ||
                !selectedAssignmentId ||
                !selectedLecturerId
              }
              className="h-12 w-full rounded-2xl font-black shadow-lg shadow-primary/15"
            >
              {" "}
              {isAssigning ? (
                <>
                  {" "}
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                  Allocation...{" "}
                </>
              ) : (
                <>
                  {" "}
                  <Plus className="mr-2 h-4 w-4" />{" "}
                  {existingPrimary
                    ? "Switch Primary Lecturer"
                    : "Allocate Lecturer"}{" "}
                </>
              )}{" "}
            </Button>{" "}
          </div>{" "}
        </form>{" "}
        <section className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          {" "}
          <div className="border-b border-border bg-muted/40 p-5">
            {" "}
            <div className="flex min-w-0 items-center gap-3">
              {" "}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {" "}
                <Users className="h-5 w-5" />{" "}
              </div>{" "}
              <div className="min-w-0">
                {" "}
                <h2 className="truncate font-black text-foreground">
                  {" "}
                  Active Lecturer Allocations{" "}
                </h2>{" "}
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {" "}
                  Current intake-specific teaching responsibilities.{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {activeAllocations.length === 0 ? (
            <EmptyAllocations />
          ) : (
            <div className="grid min-w-0 gap-3 p-4 sm:grid-cols-2">
              {" "}
              {activeAllocations.map((allocation) => (
                <AllocationCard
                  key={allocation.id}
                  allocation={allocation}
                  isEnding={isEnding}
                  onEnd={handleEndAllocation}
                />
              ))}{" "}
            </div>
          )}{" "}
        </section>{" "}
      </section>{" "}
      <section className="min-w-0 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        {" "}
        <div className="border-b border-border bg-muted/40 p-5">
          {" "}
          <div className="flex min-w-0 items-center gap-3">
            {" "}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {" "}
              <History className="h-5 w-5" />{" "}
            </div>{" "}
            <div className="min-w-0">
              {" "}
              <h2 className="truncate font-black text-foreground">
                {" "}
                Allocation History{" "}
              </h2>{" "}
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {" "}
                Ended and replaced teaching assignments.{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {historicalAllocations.length === 0 ? (
          <div className="px-5 py-12 text-center">
            {" "}
            <History className="mx-auto h-8 w-8 text-muted-foreground" />{" "}
            <p className="mt-3 font-black text-foreground">
              {" "}
              No allocation history{" "}
            </p>{" "}
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {" "}
              Ended or switched lecturer assignments will appear here.{" "}
            </p>{" "}
          </div>
        ) : (
          <div className="grid min-w-0 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {" "}
            {historicalAllocations.map((allocation) => (
              <HistoryCard key={allocation.id} allocation={allocation} />
            ))}{" "}
          </div>
        )}{" "}
      </section>{" "}
      <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-sm">
        {" "}
        <div className="flex items-start gap-3">
          {" "}
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />{" "}
          <div>
            {" "}
            <p className="font-black text-emerald-800">
              {" "}
              Coordinator-controlled teaching allocation{" "}
            </p>{" "}
            <p className="mt-1 text-sm font-semibold leading-6 text-emerald-700">
              {" "}
              Only approved semester units can receive lecturers. Switching a
              primary lecturer safely ends the previous allocation and preserves
              its history.{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
    </div>
  );
}
function SelectField({
  name,
  label,
  value,
  onChange,
  placeholder,
  options,
  disabled = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-2">
      {" "}
      <label htmlFor={name} className="text-sm font-black text-foreground/80">
        {" "}
        {label} <span className="text-destructive"> * </span>{" "}
      </label>{" "}
      <select
        required
        name={name}
        id={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-12 w-full min-w-0 rounded-2xl border border-input bg-background px-4 text-sm font-bold text-foreground shadow-sm outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {" "}
        <option value=""> {placeholder} </option>{" "}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {" "}
            {option.label}{" "}
          </option>
        ))}{" "}
      </select>{" "}
    </div>
  );
}
function AllocationCard({
  allocation,
  isEnding,
  onEnd,
}: {
  allocation: AllocationRecord;
  isEnding: boolean;
  onEnd: (allocation: AllocationRecord) => void;
}) {
  return (
    <article className="relative min-w-0 overflow-hidden rounded-3xl border border-border bg-background p-4 shadow-sm">
      {" "}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500" />{" "}
      <div className="min-w-0 pl-2">
        {" "}
        <div className="flex min-w-0 items-start gap-3">
          {" "}
          <LecturerAvatar
            firstName={allocation.lecturer.firstName}
            lastName={allocation.lecturer.lastName}
          />{" "}
          <div className="min-w-0 flex-1">
            {" "}
            <p className="break-words font-black text-foreground">
              {" "}
              {allocation.lecturer.firstName}{" "}
              {allocation.lecturer.lastName}{" "}
            </p>{" "}
            <p className="mt-1 flex min-w-0 items-center gap-1 text-xs font-semibold text-muted-foreground">
              {" "}
              <Mail className="h-3.5 w-3.5 shrink-0" />{" "}
              <span className="truncate">
                {" "}
                {allocation.lecturer.email}{" "}
              </span>{" "}
            </p>{" "}
          </div>{" "}
          <RoleBadge role={allocation.allocationRole} />{" "}
        </div>{" "}
        <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-3">
          {" "}
          <DetailRow label="Intake" value={allocation.intake.code} />{" "}
          <DetailRow
            label="Academic Period"
            value={`${allocation.unitAssignment.semester.courseYear.title} — ${allocation.unitAssignment.semester.title}`}
          />{" "}
          <DetailRow
            label="Unit"
            value={`${allocation.unitAssignment.unit.code} — ${allocation.unitAssignment.unit.title}`}
          />{" "}
          <DetailRow label="Started" value={formatDate(allocation.startsAt)} />{" "}
          <DetailRow
            label="Allocated By"
            value={`${allocation.allocatedBy.firstName} ${allocation.allocatedBy.lastName}`}
          />{" "}
        </div>{" "}
        {allocation.changeReason ? (
          <div className="mt-3 rounded-2xl border border-primary/15 bg-primary/5 p-3">
            {" "}
            <p className="text-[10px] font-black uppercase tracking-wider text-primary">
              {" "}
              Allocation Note{" "}
            </p>{" "}
            <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
              {" "}
              {allocation.changeReason}{" "}
            </p>{" "}
          </div>
        ) : null}{" "}
        <button
          type="button"
          onClick={() => onEnd(allocation)}
          disabled={isEnding}
          className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs font-black text-rose-700 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {" "}
          {isEnding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserMinus className="h-4 w-4" />
          )}{" "}
          End Allocation{" "}
        </button>{" "}
      </div>{" "}
    </article>
  );
}
function HistoryCard({ allocation }: { allocation: AllocationRecord }) {
  return (
    <article className="min-w-0 rounded-3xl border border-border bg-background p-4 shadow-sm">
      {" "}
      <div className="flex min-w-0 items-start gap-3">
        {" "}
        <LecturerAvatar
          firstName={allocation.lecturer.firstName}
          lastName={allocation.lecturer.lastName}
        />{" "}
        <div className="min-w-0 flex-1">
          {" "}
          <p className="break-words font-black text-foreground">
            {" "}
            {allocation.lecturer.firstName} {allocation.lecturer.lastName}{" "}
          </p>{" "}
          <p className="mt-1 break-words text-xs font-semibold text-muted-foreground">
            {" "}
            {allocation.unitAssignment.unit.code} •{" "}
            {allocation.intake.code}{" "}
          </p>{" "}
        </div>{" "}
        <RoleBadge role={allocation.allocationRole} />{" "}
      </div>{" "}
      <div className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-3">
        {" "}
        <DetailRow
          label="Unit"
          value={`${allocation.unitAssignment.unit.code} — ${allocation.unitAssignment.unit.title}`}
        />{" "}
        <DetailRow label="Started" value={formatDate(allocation.startsAt)} />{" "}
        <DetailRow
          label="Ended"
          value={
            allocation.endsAt ? formatDate(allocation.endsAt) : "Not recorded"
          }
        />{" "}
        {allocation.endedBy ? (
          <DetailRow
            label="Ended By"
            value={`${allocation.endedBy.firstName} ${allocation.endedBy.lastName}`}
          />
        ) : null}{" "}
      </div>{" "}
      {allocation.changeReason ? (
        <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
          {" "}
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
            {" "}
            Change Reason{" "}
          </p>{" "}
          <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
            {" "}
            {allocation.changeReason}{" "}
          </p>{" "}
        </div>
      ) : null}{" "}
    </article>
  );
}
function LecturerAvatar({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-sm font-black text-primary-foreground shadow-md shadow-primary/15">
      {" "}
      {initials}{" "}
    </div>
  );
}
function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    PRIMARY: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    CO_LECTURER: "border-sky-500/20 bg-sky-500/10 text-sky-700",
    ASSISTANT: "border-violet-500/20 bg-violet-500/10 text-violet-700",
  };
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${styles[role] || "border-border bg-muted text-muted-foreground"}`}
    >
      {" "}
      {formatEnum(role)}{" "}
    </span>
  );
}
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3 text-xs">
      {" "}
      <span className="shrink-0 font-bold text-muted-foreground">
        {" "}
        {label}{" "}
      </span>{" "}
      <span className="min-w-0 break-words text-right font-black text-foreground">
        {" "}
        {value}{" "}
      </span>{" "}
    </div>
  );
}
function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      {" "}
      <span className="shrink-0 font-bold text-muted-foreground">
        {" "}
        {label}{" "}
      </span>{" "}
      <span className="break-words text-right font-black text-foreground">
        {" "}
        {value}{" "}
      </span>{" "}
    </div>
  );
}
function HeroStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="min-w-[100px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center backdrop-blur">
      {" "}
      <p className="text-xl font-black text-white"> {value} </p>{" "}
      <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-white/60">
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
    <div className="group min-w-0 overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      {" "}
      <div className="flex min-w-0 items-start justify-between gap-3">
        {" "}
        <div className="min-w-0">
          {" "}
          <p className="truncate text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            {" "}
            {title}{" "}
          </p>{" "}
          <p className="mt-2 break-words text-2xl font-black text-foreground">
            {" "}
            {value}{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
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
function EmptyAllocations() {
  return (
    <div className="px-5 py-14 text-center">
      {" "}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        {" "}
        <UserCheck className="h-8 w-8" />{" "}
      </div>{" "}
      <p className="mt-4 text-lg font-black text-foreground">
        {" "}
        No active lecturer allocations{" "}
      </p>{" "}
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
        {" "}
        Select an intake, approved unit, teaching role, and lecturer to create
        the first allocation.{" "}
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
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
