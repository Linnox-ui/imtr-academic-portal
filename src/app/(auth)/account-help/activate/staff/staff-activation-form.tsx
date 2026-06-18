"use client";

import type { ElementType, FormEvent, ReactNode } from "react";

import {
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  Fingerprint,
  Hash,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { verifyStaffIdentityAndBeginActivation } from "@/app/actions/self-service-account-activation.actions";

export function StaffActivationForm() {
  const [staffNumber, setStaffNumber] =
    useState("");

  const [nationalId, setNationalId] =
    useState("");

  const [dateOfBirth, setDateOfBirth] =
    useState("");

  const [showIdentity, setShowIdentity] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    const formData =
      new FormData();

    formData.set(
      "staffNumber",
      staffNumber.trim(),
    );

    formData.set(
      "nationalId",
      nationalId.trim(),
    );

    formData.set(
      "dateOfBirth",
      dateOfBirth,
    );

    startTransition(async () => {
      const result =
        await verifyStaffIdentityAndBeginActivation(
          formData,
        );

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result.redirectTo) {
        setError(
          "The secure password page could not be opened.",
        );
        return;
      }

      window.location.assign(
        result.redirectTo,
      );
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-100/70 px-4 py-3 text-rose-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <p className="text-xs font-black leading-5">
            {error}
          </p>
        </div>
      ) : null}

      <Field
        id="staffNumber"
        label="Staff number"
        icon={Hash}
        type="text"
        value={staffNumber}
        onChange={(value) => {
          setStaffNumber(
            value
              .toUpperCase()
              .replace(/\\/g, "/")
              .replace(/\s+/g, "")
              .slice(0, 28),
          );

          if (error) {
            setError("");
          }
        }}
        placeholder="IMTR/STF/2026/001"
        autoComplete="off"
        disabled={isPending}
        mono
      />

      <Field
        id="nationalId"
        label="National ID or passport"
        icon={Fingerprint}
        type={
          showIdentity
            ? "text"
            : "password"
        }
        value={nationalId}
        onChange={(value) => {
          setNationalId(
            value
              .toUpperCase()
              .replace(/[\s-]+/g, "")
              .slice(0, 20),
          );

          if (error) {
            setError("");
          }
        }}
        placeholder="Registered identity number"
        autoComplete="off"
        disabled={isPending}
        trailing={
          <button
            type="button"
            onClick={() =>
              setShowIdentity(
                (current) =>
                  !current,
              )
            }
            aria-label={
              showIdentity
                ? "Hide identity number"
                : "Show identity number"
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-300/70 hover:text-slate-700"
          >
            {showIdentity ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
      />

      <Field
        id="dateOfBirth"
        label="Date of birth"
        icon={CalendarDays}
        type="date"
        value={dateOfBirth}
        onChange={(value) => {
          setDateOfBirth(value);

          if (error) {
            setError("");
          }
        }}
        placeholder=""
        autoComplete="bday"
        disabled={isPending}
      />

      <button
        type="submit"
        disabled={
          isPending ||
          !staffNumber.trim() ||
          !nationalId.trim() ||
          !dateOfBirth
        }
        className="group inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#082f49] px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0c4a6e] hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Verify and Continue
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </>
        )}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
  trailing,
  mono = false,
}: {
  id: string;
  label: string;
  icon: ElementType;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  disabled: boolean;
  trailing?: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-xs font-black text-slate-700"
      >
        {label}
      </label>

      <div className="group relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-700" />

        <input
          required
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck={false}
          className={`h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-12 text-sm font-black text-slate-950 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60 ${
            mono
              ? "font-mono uppercase tracking-wide"
              : ""
          }`}
        />

        {trailing ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  );
}
