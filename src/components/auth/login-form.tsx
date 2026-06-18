"use client";

import type {
  ElementType,
  FormEvent,
  ReactNode,
} from "react";

import {
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";

import {
  getSession,
  signIn,
} from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { getDashboardForRole } from "@/lib/role-routing";

export function LoginForm() {
  const searchParams = useSearchParams();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const recoverySuccess =
    searchParams.get("recovery") ===
    "success";

  const callbackUrl =
    searchParams.get("callbackUrl");

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setError("");

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedEmail ||
      !password
    ) {
      setError(
        "Enter your email and password.",
      );
      return;
    }

    startTransition(async () => {
      try {
        const result = await signIn(
          "credentials",
          {
            email: normalizedEmail,
            password,
            redirect: false,
          },
        );

        if (
          !result ||
          result.error
        ) {
          setError(
            "Email or password is incorrect.",
          );
          return;
        }

        const session =
          await getSession();

        const role =
          session?.user?.role;

        const destination =
          callbackUrl &&
          callbackUrl.startsWith("/")
            ? callbackUrl
            : getDashboardForRole(
                role,
              );

        window.location.assign(
          destination,
        );
      } catch {
        setError(
          "Sign in could not be completed.",
        );
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      {recoverySuccess ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
          Password saved. Sign in below.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <p className="text-xs font-bold leading-5">
            {error}
          </p>
        </div>
      ) : null}

      <Field
        id="email"
        label="Email"
        type="email"
        icon={Mail}
        value={email}
        onChange={(value) => {
          setEmail(value);

          if (error) {
            setError("");
          }
        }}
        autoComplete="email"
        placeholder="name@imtr.ac.ke"
        disabled={isPending}
      />

      <Field
        id="password"
        label="Password"
        type={
          showPassword
            ? "text"
            : "password"
        }
        icon={LockKeyhole}
        value={password}
        onChange={(value) => {
          setPassword(value);

          if (error) {
            setError("");
          }
        }}
        autoComplete="current-password"
        placeholder="Enter password"
        disabled={isPending}
        trailing={
          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (current) =>
                  !current,
              )
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            {showPassword ? (
              <EyeOff className="h-[18px] w-[18px]" />
            ) : (
              <Eye className="h-[18px] w-[18px]" />
            )}
          </button>
        }
      />

      <button
        type="submit"
        disabled={
          isPending ||
          !email.trim() ||
          !password
        }
        className="group mt-2 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#082f49] px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0c4a6e] hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
            Signing in
          </>
        ) : (
          <>
            Continue
            <ArrowRight className="ml-2 h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
          </>
        )}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  type,
  icon: Icon,
  value,
  onChange,
  autoComplete,
  placeholder,
  disabled,
  trailing,
}: {
  id: string;
  label: string;
  type: string;
  icon: ElementType;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder: string;
  disabled: boolean;
  trailing?: ReactNode;
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
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-200/60 pl-11 pr-12 text-sm font-bold text-slate-950 outline-none transition-all placeholder:font-medium placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
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
