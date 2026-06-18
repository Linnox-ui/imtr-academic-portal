"use client";

import type { FormEvent } from "react";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { completeAuthorizedPasswordAction } from "@/app/actions/account-help.actions";

export function SetPasswordForm({
  purpose,
}: {
  purpose:
    | "ACCOUNT_ACTIVATION"
    | "PASSWORD_RESET";
}) {
  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const checks = useMemo(
    () => [
      {
        label: "10+",
        passed:
          password.length >= 10,
      },
      {
        label: "A–Z",
        passed:
          /[A-Z]/.test(password),
      },
      {
        label: "a–z",
        passed:
          /[a-z]/.test(password),
      },
      {
        label: "0–9",
        passed:
          /\d/.test(password),
      },
      {
        label: "#",
        passed:
          /[^A-Za-z0-9]/.test(
            password,
          ),
      },
    ],
    [password],
  );

  const passedCount =
    checks.filter(
      (check) => check.passed,
    ).length;

  const allChecksPassed =
    passedCount === checks.length;

  const passwordsMatch =
    password.length > 0 &&
    password === confirmPassword;

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    if (!allChecksPassed) {
      setError(
        "Password is not strong enough.",
      );
      return;
    }

    if (!passwordsMatch) {
      setError(
        "Passwords do not match.",
      );
      return;
    }

    const formData =
      new FormData();

    formData.set(
      "password",
      password,
    );

    formData.set(
      "confirmPassword",
      confirmPassword,
    );

    startTransition(async () => {
      const result =
        await completeAuthorizedPasswordAction(
          formData,
        );

      if (result.error) {
        setError(result.error);

        if (result.redirectTo) {
          window.setTimeout(() => {
            window.location.assign(
              result.redirectTo as string,
            );
          }, 1200);
        }

        return;
      }

      window.location.assign(
        result.redirectTo ??
          "/login",
      );
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
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

      <PasswordField
        id="new-password"
        label="New password"
        value={password}
        onChange={(value) => {
          setPassword(value);

          if (error) {
            setError("");
          }
        }}
        showPassword={showPassword}
        onToggleVisibility={() =>
          setShowPassword(
            (current) =>
              !current,
          )
        }
        disabled={isPending}
      />

      <PasswordField
        id="confirm-password"
        label="Confirm password"
        value={confirmPassword}
        onChange={(value) => {
          setConfirmPassword(value);

          if (error) {
            setError("");
          }
        }}
        showPassword={showPassword}
        onToggleVisibility={() =>
          setShowPassword(
            (current) =>
              !current,
          )
        }
        disabled={isPending}
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Password strength
          </p>

          <p className="text-[10px] font-black text-slate-500">
            {passedCount}/5
          </p>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {checks.map((check) => (
            <div
              key={check.label}
              className={`flex h-9 items-center justify-center rounded-xl border text-[10px] font-black transition-all duration-300 ${
                check.passed
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                  : "border-slate-300 bg-slate-200/70 text-slate-500"
              }`}
            >
              {check.passed ? (
                <Check className="mr-1 h-3 w-3" />
              ) : null}

              {check.label}
            </div>
          ))}
        </div>

        <div
          className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black transition-all ${
            passwordsMatch
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-200/70 text-slate-500"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
          Passwords match
        </div>
      </div>

      <button
        type="submit"
        disabled={
          isPending ||
          !allChecksPassed ||
          !passwordsMatch
        }
        className="group inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#082f49] px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0c4a6e] hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-4 w-4" />

            {purpose ===
            "ACCOUNT_ACTIVATION"
              ? "Activate Account"
              : "Save New Password"}
          </>
        )}
      </button>
    </form>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  showPassword,
  onToggleVisibility,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  showPassword: boolean;
  onToggleVisibility: () => void;
  disabled: boolean;
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
        <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-700" />

        <input
          required
          id={id}
          type={
            showPassword
              ? "text"
              : "password"
          }
          autoComplete="new-password"
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          disabled={disabled}
          className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-12 text-sm font-black text-slate-950 outline-none transition-all focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10"
        />

        <button
          type="button"
          onClick={
            onToggleVisibility
          }
          disabled={disabled}
          aria-label={
            showPassword
              ? "Hide password"
              : "Show password"
          }
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-300/70 hover:text-slate-700"
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
