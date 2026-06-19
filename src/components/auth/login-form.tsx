"use client";

import type { ElementType, FormEvent, ReactNode } from "react";
import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { getDashboardForRole } from "@/lib/role-routing";

export function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [isPending, startTransition] = useTransition();

  const recoverySuccess = searchParams.get("recovery") === "success";
  const callbackUrl = searchParams.get("callbackUrl");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await signIn("credentials", {
          email: normalizedEmail,
          password,
          redirect: false,
        });

        if (!result || result.error) {
          setError("Email or password is incorrect.");
          return;
        }

        const session = await getSession();
        const role = session?.user?.role;

        const destination =
          callbackUrl && callbackUrl.startsWith("/")
            ? callbackUrl
            : getDashboardForRole(role);

        // Uses Next.js router for a seamless client-side transition
        router.push(destination);
        router.refresh();
      } catch {
        setError("Sign in could not be completed.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          recoverySuccess
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
            Password saved. Sign in below.
          </div>
        </div>
      </div>

      <div
        className={`grid transition-all duration-300 ease-in-out ${
          error ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs font-bold leading-5">{error}</p>
          </div>
        </div>
      </div>

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
        type={showPassword ? "text" : "password"}
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
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 active:scale-95"
          >
            <div className="relative flex h-full w-full items-center justify-center">
              <EyeOff
                className={`absolute h-[18px] w-[18px] transition-all duration-300 ${
                  showPassword
                    ? "rotate-0 scale-100 opacity-100"
                    : "-rotate-90 scale-50 opacity-0"
                }`}
              />
              <Eye
                className={`absolute h-[18px] w-[18px] transition-all duration-300 ${
                  !showPassword
                    ? "rotate-0 scale-100 opacity-100"
                    : "rotate-90 scale-50 opacity-0"
                }`}
              />
            </div>
          </button>
        }
      />

      <button
        type="submit"
        disabled={isPending || !email.trim() || !password}
        className="group relative mt-2 flex h-12 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#082f49] px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0c4a6e] hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
      >
        <div
          className={`absolute flex items-center transition-all duration-500 ${
            isPending ? "-translate-y-8 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          Continue
          <ArrowRight className="ml-2 h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
        </div>

        <div
          className={`absolute flex items-center transition-all duration-500 ${
            isPending ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <Loader2 className="mr-2 h-[18px] w-[18px] animate-spin" />
          Signing in
        </div>
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
        className="text-xs font-black text-slate-700 transition-colors"
      >
        {label}
      </label>

      <div className="group relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-all duration-300 group-focus-within:scale-110 group-focus-within:text-sky-700" />

        <input
          required
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-200/60 pl-11 pr-12 text-sm font-bold text-slate-950 outline-none transition-all duration-300 placeholder:font-medium placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
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
