"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  KeyRound,
  Loader2,
} from "lucide-react";

import { beginAuthorizedPasswordAction } from "@/app/actions/account-help.actions";

export function AuthorizedPasswordAction() {
  const [error, setError] =
    useState("");

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const handleOpen = () => {
    setError("");

    startTransition(async () => {
      const result =
        await beginAuthorizedPasswordAction();

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

      if (!result.redirectTo) {
        setError(
          "The password page could not be opened.",
        );
        return;
      }

      window.location.assign(
        result.redirectTo,
      );
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
          <KeyRound className="h-5 w-5" />
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
            Secure action
          </p>

          <p className="mt-1 text-sm font-black">
            Password ready
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-3 py-2.5 text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <p className="text-xs font-black">
            {error}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleOpen}
        disabled={isPending}
        className="group mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening
          </>
        ) : (
          <>
            Set New Password
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>
    </div>
  );
}
