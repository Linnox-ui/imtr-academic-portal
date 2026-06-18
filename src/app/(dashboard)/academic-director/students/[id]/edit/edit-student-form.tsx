"use client";

import type {
  ElementType,
  FormEvent,
} from "react";

import {
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Fingerprint,
  GraduationCap,
  Hash,
  Loader2,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";

import { updateStudent } from "@/app/actions/student.actions";

type StudentRecord = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  nationalId: string;
  gender: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  courseCode: string;
  status: string;
};

type IntakeOption = {
  id: string;
  code: string;
  title: string;
  year: number;
  status: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseCategory: string;
  assessmentMode: string;
};

type EditStudentFormProps = {
  student: StudentRecord;
  intakeOptions: IntakeOption[];
};

export function EditStudentForm({
  student,
  intakeOptions,
}: EditStudentFormProps) {
  const currentIntake = intakeOptions.find(
    (intake) =>
      intake.code === student.courseCode,
  );

  const [
    selectedIntakeId,
    setSelectedIntakeId,
  ] = useState(currentIntake?.id || "");

  const selectedIntake = useMemo(
    () =>
      intakeOptions.find(
        (intake) =>
          intake.id === selectedIntakeId,
      ),
    [intakeOptions, selectedIntakeId],
  );

  const submittedCourseCode =
    selectedIntake?.code || student.courseCode;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-5 py-6 text-white shadow-xl shadow-slate-900/10 sm:px-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-sky-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href={`/academic-director/students/${student.id}`}
              aria-label="Back to student profile"
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-slate-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="min-w-0 animate-in fade-in slide-in-from-left-3 duration-500">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-sky-300">
                {student.admissionNumber}
              </p>

              <h1 className="mt-2 break-words text-2xl font-black tracking-tight sm:text-3xl">
                Edit Student
              </h1>

              <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-400">
                {student.firstName} {student.lastName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <HeroStat
              label="Admission"
              value={student.admissionNumber}
            />

            <HeroStat
              label="Intake"
              value={submittedCourseCode}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <form
          action={updateStudent}
          className="space-y-5"
        >
          <input
            type="hidden"
            name="id"
            value={student.id}
          />

          <input
            type="hidden"
            name="courseCode"
            value={submittedCourseCode}
          />

          <input
            type="hidden"
            name="intakeId"
            value={selectedIntake?.id || ""}
          />

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <SectionHeader
              icon={User}
              title="Student identity"
              subtitle="Legal name and identification."
            />

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <TextField
                name="firstName"
                label="First name"
                defaultValue={student.firstName}
                required
              />

              <TextField
                name="lastName"
                label="Last name"
                defaultValue={student.lastName}
                required
              />

              <div className="space-y-2 sm:col-span-2">
                <label
                  htmlFor="nationalId"
                  className="text-xs font-black text-slate-700"
                >
                  National ID / Passport
                </label>

                <div className="relative">
                  <Fingerprint className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

                  <input
                    required
                    type="text"
                    name="nationalId"
                    id="nationalId"
                    defaultValue={student.nationalId}
                    className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-4 text-sm font-bold text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <SectionHeader
              icon={Mail}
              title="Contact details"
              subtitle="Demographics and communication."
            />

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <div className="space-y-2">
                <label
                  htmlFor="gender"
                  className="text-xs font-black text-slate-700"
                >
                  Gender
                </label>

                <select
                  required
                  name="gender"
                  id="gender"
                  defaultValue={student.gender}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
                >
                  <option value="">
                    Select gender
                  </option>
                  <option value="MALE">
                    Male
                  </option>
                  <option value="FEMALE">
                    Female
                  </option>
                </select>
              </div>

              <IconField
                icon={Calendar}
                type="date"
                name="dateOfBirth"
                label="Date of birth"
                defaultValue={student.dateOfBirth}
                required
              />

              <IconField
                icon={Mail}
                type="email"
                name="email"
                label="Email"
                defaultValue={student.email}
                required
              />

              <IconField
                icon={Phone}
                type="tel"
                name="phone"
                label="Phone"
                defaultValue={student.phone}
                required
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100/80 shadow-sm">
            <SectionHeader
              icon={GraduationCap}
              title="Academic placement"
              subtitle="Move to another intake only when required."
            />

            <div className="space-y-4 p-5 sm:p-6">
              <div className="space-y-2">
                <label
                  htmlFor="intakeSelect"
                  className="text-xs font-black text-slate-700"
                >
                  Intake
                </label>

                <select
                  required
                  id="intakeSelect"
                  value={selectedIntakeId}
                  onChange={(event) =>
                    setSelectedIntakeId(
                      event.target.value,
                    )
                  }
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
                >
                  <option value="">
                    Select intake
                  </option>

                  {intakeOptions.map((intake) => (
                    <option
                      key={intake.id}
                      value={intake.id}
                    >
                      {intake.code} — {intake.title} | {intake.courseTitle}
                    </option>
                  ))}
                </select>

                {!currentIntake ? (
                  <p className="text-xs font-bold text-amber-700">
                    Current stored code is {student.courseCode}. Select an intake to relink this record.
                  </p>
                ) : null}
              </div>

              {selectedIntake ? (
                <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-200/50 p-4 sm:grid-cols-2">
                  <PreviewItem
                    icon={Hash}
                    label="Intake"
                    value={selectedIntake.code}
                  />

                  <PreviewItem
                    icon={Calendar}
                    label="Year"
                    value={`${selectedIntake.year}`}
                  />

                  <div className="sm:col-span-2">
                    <PreviewItem
                      icon={GraduationCap}
                      label="Course"
                      value={`${selectedIntake.courseCode} — ${selectedIntake.courseTitle}`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <PreviewItem
                      icon={BadgeCheck}
                      label="Assessment"
                      value={formatEnum(
                        selectedIntake.assessmentMode,
                      )}
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <label
                  htmlFor="status"
                  className="text-xs font-black text-slate-700"
                >
                  Status
                </label>

                <select
                  required
                  name="status"
                  id="status"
                  defaultValue={student.status}
                  className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
                >
                  <option value="ACTIVE">
                    Active
                  </option>
                  <option value="SUSPENDED">
                    Suspended
                  </option>
                  <option value="INACTIVE">
                    Inactive
                  </option>
                  <option value="GRADUATED">
                    Graduated
                  </option>
                  <option value="WITHDRAWN">
                    Withdrawn
                  </option>
                  <option value="DEFERRED">
                    Deferred
                  </option>
                </select>
              </div>

              <p className="flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500">
                <Fingerprint className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Admission number remains unchanged. This page updates profile details and stored placement code.
              </p>
            </div>
          </section>

          <FormFooter studentId={student.id} />
        </form>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[26px] border border-slate-200 bg-slate-100/80 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-950">
                  Edit rules
                </h2>

                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  Keep student identity stable.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <GuideItem text="Use intake dropdown instead of manual code editing." />
              <GuideItem text="Changing intake does not change admission number." />
              <GuideItem text="Status changes affect visibility and reporting." />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group inline-flex h-12 items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
    >
      {pending ? (
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
  );
}

function FormFooter({
  studentId,
}: {
  studentId: string;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-3 border-t border-slate-200 bg-slate-50/90 px-3 py-3 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href={`/academic-director/students/${studentId}`}
          className="inline-flex h-12 items-center justify-center rounded-2xl px-5 text-sm font-black text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
        >
          Cancel
        </Link>

        <SubmitButton />
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

function TextField({
  name,
  label,
  defaultValue,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
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
        type="text"
        name={name}
        id={name}
        defaultValue={defaultValue}
        className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 px-4 text-sm font-bold text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
      />
    </div>
  );
}

function IconField({
  icon: Icon,
  type,
  name,
  label,
  defaultValue,
  required = false,
}: {
  icon: ElementType;
  type: string;
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="text-xs font-black text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />

        <input
          required={required}
          type={type}
          name={name}
          id={name}
          defaultValue={defaultValue}
          className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-4 text-sm font-bold text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
        />
      </div>
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
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

      <p className="text-xs font-bold leading-5 text-slate-600">
        {text}
      </p>
    </div>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[110px] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center">
      <p className="break-words text-sm font-black text-white">
        {value}
      </p>

      <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
        {label}
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
