"use client";

import type { FormEvent } from "react";

import {
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Hash,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { verifyRecoveryTicketAccess } from "@/app/actions/account-help.actions";

export function TicketAccessForm() {
  const [ticketNumber, setTicketNumber] =
    useState("");

  const [accessCode, setAccessCode] =
    useState("");

  const [showCode, setShowCode] =
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
      "ticketNumber",
      ticketNumber.trim(),
    );

    formData.set(
      "privateAccessCode",
      accessCode.trim(),
    );

    startTransition(async () => {
      const result =
        await verifyRecoveryTicketAccess(
          formData,
        );

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!result.redirectTo) {
        setError(
          "The secure ticket workspace could not be opened.",
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

      <div className="space-y-2">
        <label
          htmlFor="ticketNumber"
          className="text-xs font-black text-slate-700"
        >
          Ticket number
        </label>

        <div className="group relative">
          <Hash className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-700" />

          <input
            required
            id="ticketNumber"
            name="ticketNumber"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={ticketNumber}
            onChange={(event) => {
              setTicketNumber(
                event.target.value
                  .toUpperCase()
                  .replace(/\s+/g, "")
                  .slice(0, 28),
              );

              if (error) {
                setError("");
              }
            }}
            disabled={isPending}
            placeholder="IMTR-REC-2026-123456"
            className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-4 font-mono text-sm font-black uppercase tracking-wide text-slate-950 outline-none transition-all placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="privateAccessCode"
          className="text-xs font-black text-slate-700"
        >
          Private access code
        </label>

        <div className="group relative">
          <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-sky-700" />

          <input
            required
            id="privateAccessCode"
            name="privateAccessCode"
            type={
              showCode
                ? "text"
                : "password"
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            value={accessCode}
            onChange={(event) => {
              setAccessCode(
                event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 6),
              );

              if (error) {
                setError("");
              }
            }}
            disabled={isPending}
            placeholder="6-digit code"
            className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-200/60 pl-11 pr-12 font-mono text-sm font-black tracking-[0.22em] text-slate-950 outline-none transition-all placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 focus:border-sky-600 focus:bg-slate-100 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
          />

          <button
            type="button"
            onClick={() =>
              setShowCode(
                (current) =>
                  !current,
              )
            }
            aria-label={
              showCode
                ? "Hide access code"
                : "Show access code"
            }
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-300/70 hover:text-slate-700"
          >
            {showCode ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={
          isPending ||
          !ticketNumber.trim() ||
          accessCode.length !== 6
        }
        className="group inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#082f49] px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0c4a6e] hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening ticket
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Open Ticket
            <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </>
        )}
      </button>
    </form>
  );
}
