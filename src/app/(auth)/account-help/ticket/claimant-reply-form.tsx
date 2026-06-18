"use client";

import type { FormEvent } from "react";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";

import { postClaimantTicketMessage } from "@/app/actions/account-help.actions";

const MAX_MESSAGE_LENGTH = 2000;

export function ClaimantReplyForm() {
  const router = useRouter();

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
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
    setSuccess("");

    const normalizedMessage =
      message.trim();

    if (!normalizedMessage) {
      setError("Enter a message.");
      return;
    }

    const formData =
      new FormData();

    formData.set(
      "message",
      normalizedMessage,
    );

    startTransition(async () => {
      const result =
        await postClaimantTicketMessage(
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

      setMessage("");
      setSuccess("Message sent.");
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3"
      noValidate
    >
      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-100 px-3 py-2.5 text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <p className="text-xs font-black">
            {error}
          </p>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-300 bg-emerald-100 px-3 py-2.5 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

          <p className="text-xs font-black">
            {success}
          </p>
        </div>
      ) : null}

      <div className="relative">
        <textarea
          required
          id="claimant-message"
          name="message"
          rows={3}
          maxLength={MAX_MESSAGE_LENGTH}
          value={message}
          onChange={(event) => {
            setMessage(
              event.target.value,
            );

            if (error) {
              setError("");
            }

            if (success) {
              setSuccess("");
            }
          }}
          disabled={isPending}
          placeholder="Write a secure message..."
          className="w-full resize-none rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 pr-14 text-sm font-semibold leading-6 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-sky-600 focus:ring-4 focus:ring-sky-600/10 disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={
            isPending ||
            message.trim().length < 2
          }
          aria-label="Send message"
          className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#082f49] text-white transition-all hover:bg-[#0c4a6e] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
        <span>
          Do not share passwords or access codes.
        </span>

        <span>
          {message.length}/
          {MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </form>
  );
}
