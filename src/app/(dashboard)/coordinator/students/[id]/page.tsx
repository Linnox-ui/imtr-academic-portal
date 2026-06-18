import type { ElementType } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Hash,
  IdCard,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
type CoordinatorStudentDetailsPageProps = { params: Promise<{ id: string }> };
export default async function CoordinatorStudentDetailsPage({
  params,
}: CoordinatorStudentDetailsPageProps) {
  const { id } = await params;
  const scope = await requireCoordinatorScope();
  const student = await prisma.student.findFirst({
    where: scope.isGlobal ? { id } : ({ id, intakeId: scope.intakeId } as any),
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      nationalId: true,
      email: true,
      phone: true,
      gender: true,
      dateOfBirth: true,
      courseCode: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      intake: {
        select: {
          id: true,
          code: true,
          title: true,
          year: true,
          status: true,
          course: {
            select: { id: true, code: true, title: true, category: true },
          },
        },
      },
    },
  });
  if (!student) {
    notFound();
  }
  const studentName = `${student.firstName} ${student.lastName}`;
  return (
    <div className="space-y-6">
      {" "}
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7 sm:py-7">
        {" "}
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />{" "}
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />{" "}
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {" "}
          <div className="animate-in fade-in slide-in-from-left-3 duration-500">
            {" "}
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
              {" "}
              Student Profile{" "}
            </p>{" "}
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              {" "}
              {studentName}{" "}
            </h1>{" "}
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-400">
              {" "}
              {student.admissionNumber} ·{" "}
              {student.intake
                ? `${student.intake.code} — ${student.intake.course.code}`
                : "No intake assigned"}{" "}
            </p>{" "}
          </div>{" "}
          <Link
            href="/coordinator/students"
            className="group inline-flex h-11 w-fit items-center justify-center rounded-2xl bg-white px-4 text-xs font-black text-slate-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            {" "}
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />{" "}
            Back to Students{" "}
          </Link>{" "}
        </div>{" "}
      </section>{" "}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {" "}
        <StatCard
          icon={Hash}
          label="Admission No."
          value={student.admissionNumber}
          helper="Permanent student reference"
        />{" "}
        <StatCard
          icon={ShieldCheck}
          label="Status"
          value={formatStatus(student.status)}
          helper="Current registry state"
        />{" "}
        <StatCard
          icon={CalendarDays}
          label="Intake"
          value={student.intake?.code ?? "N/A"}
          helper={student.intake ? `${student.intake.year}` : "Not assigned"}
        />{" "}
        <StatCard
          icon={GraduationCap}
          label="Course"
          value={student.intake?.course.code ?? student.courseCode}
          helper={student.intake?.course.title ?? "Course record"}
        />{" "}
      </section>{" "}
      <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
        {" "}
        <div className="space-y-5">
          {" "}
          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            {" "}
            <SectionHeader
              icon={User}
              title="Personal Details"
              subtitle="Core identity and contact information."
            />{" "}
            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              {" "}
              <InfoCard
                icon={User}
                label="Full Name"
                value={studentName}
              />{" "}
              <InfoCard
                icon={IdCard}
                label="National ID"
                value={student.nationalId || "Not recorded"}
              />{" "}
              <InfoCard icon={Mail} label="Email" value={student.email} />{" "}
              <InfoCard icon={Phone} label="Phone" value={student.phone} />{" "}
              <InfoCard
                icon={Users}
                label="Gender"
                value={student.gender || "Not recorded"}
              />{" "}
              <InfoCard
                icon={CalendarDays}
                label="Date of Birth"
                value={
                  student.dateOfBirth
                    ? formatDate(student.dateOfBirth)
                    : "Not recorded"
                }
              />{" "}
            </div>{" "}
          </section>{" "}
          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            {" "}
            <SectionHeader
              icon={GraduationCap}
              title="Academic Placement"
              subtitle="Student intake and course assignment."
            />{" "}
            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              {" "}
              <InfoCard
                icon={Hash}
                label="Admission Number"
                value={student.admissionNumber}
              />{" "}
              <InfoCard
                icon={ShieldCheck}
                label="Student Status"
                value={formatStatus(student.status)}
              />{" "}
              <InfoCard
                icon={CalendarDays}
                label="Intake"
                value={
                  student.intake
                    ? `${student.intake.code} — ${student.intake.title}`
                    : "No intake assigned"
                }
                wide
              />{" "}
              <InfoCard
                icon={GraduationCap}
                label="Course"
                value={
                  student.intake
                    ? `${student.intake.course.code} — ${student.intake.course.title}`
                    : student.courseCode
                }
                wide
              />{" "}
              <InfoCard
                icon={CalendarDays}
                label="Registered On"
                value={formatDate(student.createdAt)}
              />{" "}
              <InfoCard
                icon={CalendarDays}
                label="Last Updated"
                value={formatDate(student.updatedAt)}
              />{" "}
            </div>{" "}
          </section>{" "}
        </div>{" "}
        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          {" "}
          <section className="rounded-[26px] border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            {" "}
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300">
              {" "}
              Student Card{" "}
            </p>{" "}
            <div className="mt-5 flex items-center gap-4">
              {" "}
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-sky-500/15 text-xl font-black text-sky-200 ring-1 ring-white/10">
                {" "}
                {getInitials(student.firstName, student.lastName)}{" "}
              </div>{" "}
              <div className="min-w-0">
                {" "}
                <h2 className="truncate text-lg font-black">
                  {studentName}
                </h2>{" "}
                <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                  {" "}
                  {student.admissionNumber}{" "}
                </p>{" "}
                <div className="mt-2">
                  {" "}
                  <StatusBadge status={student.status} />{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <div className="mt-5 space-y-3">
              {" "}
              <DarkInfo icon={Mail} label="Email" value={student.email} />{" "}
              <DarkInfo icon={Phone} label="Phone" value={student.phone} />{" "}
              <DarkInfo
                icon={CalendarDays}
                label="Intake"
                value={student.intake?.code ?? "No intake"}
              />{" "}
            </div>{" "}
          </section>{" "}
          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            {" "}
            <div className="flex items-center gap-3">
              {" "}
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                {" "}
                <ShieldCheck className="h-5 w-5" />{" "}
              </div>{" "}
              <div>
                {" "}
                <h2 className="text-base font-black text-slate-950">
                  {" "}
                  Access Check{" "}
                </h2>{" "}
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {" "}
                  This page is intake-protected.{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            <div className="mt-5 space-y-3">
              {" "}
              <GuideItem text="The student must belong to the coordinator’s assigned intake." />{" "}
              <GuideItem text="Direct URLs for other intakes will not open." />{" "}
              <GuideItem text="Student editing remains under Academic Director control." />{" "}
            </div>{" "}
          </section>{" "}
          <section className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            {" "}
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {" "}
              Quick Actions{" "}
            </p>{" "}
            <div className="mt-4 grid gap-3">
              {" "}
              <Link
                href="/coordinator/students"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-200/50 px-4 text-xs font-black text-slate-700 transition-all hover:bg-slate-200"
              >
                {" "}
                Back to Student List{" "}
              </Link>{" "}
              <Link
                href="/coordinator/classes"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-sky-700 px-4 text-xs font-black text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-sky-800"
              >
                {" "}
                View Assigned Class{" "}
              </Link>{" "}
            </div>{" "}
          </section>{" "}
        </aside>{" "}
      </section>{" "}
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
      {" "}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        {" "}
        <Icon className="h-5 w-5" />{" "}
      </div>{" "}
      <div className="min-w-0">
        {" "}
        <h2 className="truncate text-base font-black text-slate-950">
          {" "}
          {title}{" "}
        </h2>{" "}
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
          {" "}
          {subtitle}{" "}
        </p>{" "}
      </div>{" "}
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
      {" "}
      <div className="flex items-start justify-between gap-4">
        {" "}
        <div className="min-w-0">
          {" "}
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            {" "}
            {label}{" "}
          </p>{" "}
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950">
            {" "}
            {value}{" "}
          </p>{" "}
          <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
            {" "}
            {helper}{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          {" "}
          <Icon className="h-5 w-5" />{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
function InfoCard({
  icon: Icon,
  label,
  value,
  wide = false,
}: {
  icon: ElementType;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-4 ${wide ? "sm:col-span-2" : ""}`}
    >
      {" "}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
        {" "}
        <Icon className="h-4 w-4" />{" "}
      </div>{" "}
      <div className="min-w-0">
        {" "}
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          {" "}
          {label}{" "}
        </p>{" "}
        <p className="mt-1 break-words text-sm font-black text-slate-950">
          {" "}
          {value}{" "}
        </p>{" "}
      </div>{" "}
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
      {" "}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sky-300">
        {" "}
        <Icon className="h-4 w-4" />{" "}
      </div>{" "}
      <div className="min-w-0">
        {" "}
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          {" "}
          {label}{" "}
        </p>{" "}
        <p className="mt-1 break-words text-xs font-black text-white">
          {" "}
          {value}{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
}
function GuideItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-3">
      {" "}
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />{" "}
      <p className="text-xs font-bold leading-5 text-slate-600">{text}</p>{" "}
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    SUSPENDED: "bg-amber-100 text-amber-700",
    GRADUATED: "bg-slate-200 text-slate-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${styles[status] ?? "bg-slate-200 text-slate-700"}`}
    >
      {" "}
      {formatStatus(status)}{" "}
    </span>
  );
}
function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}
