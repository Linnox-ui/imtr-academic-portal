import type { Metadata } from "next";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  FileKey,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  ShieldCheck,
  TicketCheck,
  UserRound,
} from "lucide-react";

import { AuthorizedPasswordAction } from "./authorized-password-action";
import { ClaimantReplyForm } from "./claimant-reply-form";

import {
  clearAccountHelpTicketSession,
  getAccountHelpTicketSession,
} from "@/lib/account-help-ticket-session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "Secure Ticket | IMTR Academic Portal",
  description:
    "View a secure IMTR account-support ticket.",
  robots: {
    index: false,
    follow: false,
  },
};

const CLAIMANT_REPLY_STATUSES = new Set([
  "SUBMITTED",
  "IDENTITY_REVIEW",
  "MORE_INFORMATION_REQUIRED",
  "VERIFIED",
  "RESET_AUTHORIZED",
]);

async function leaveTicketWorkspace() {
  "use server";

  await clearAccountHelpTicketSession();
  redirect("/account-help");
}

export default async function AccountHelpTicketPage() {
  const ticketSession =
    await getAccountHelpTicketSession();

  if (!ticketSession) {
    redirect("/account-help/track");
  }

  const ticket =
    await prisma.accountRecoveryTicket.findFirst({
      where: {
        id: ticketSession.ticketId,
        ticketNumber:
          ticketSession.ticketNumber,
      },
      select: {
        id: true,
        ticketNumber: true,
        type: true,
        status: true,
        subject: true,
        description: true,
        claimantName: true,
        claimantEmail: true,
        claimantPhone: true,
        claimantReference: true,
        identityVerifiedAt: true,
        resolutionNote: true,
        createdAt: true,
        lastActivityAt: true,
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        verificationAttempts: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            method: true,
            status: true,
          },
        },
        messages: {
          where: {
            isInternal: false,
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            senderType: true,
            body: true,
            createdAt: true,
            senderUser: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

  if (!ticket) {
    await clearAccountHelpTicketSession();
    redirect("/account-help/track");
  }

  const latestVerification =
    ticket.verificationAttempts[0] ?? null;

  const canSetPassword =
    ticket.status === "RESET_AUTHORIZED";

  const canReply =
    CLAIMANT_REPLY_STATUSES.has(
      ticket.status,
    );

  const isResolved = [
    "RESOLVED",
    "CLOSED",
  ].includes(ticket.status);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-28 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="absolute -bottom-36 -right-28 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:46px_46px]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-4 py-5 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/account-help"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-xs font-black text-slate-300 transition-all hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Account Help
          </Link>

          <form action={leaveTicketWorkspace}>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.08] px-4 text-xs font-black text-rose-300 transition-all hover:bg-rose-400/[0.13]"
            >
              <LogOut className="h-4 w-4" />
              Close session
            </button>
          </form>
        </header>

        <section className="flex flex-1 items-center py-7">
          <div className="grid w-full gap-5 xl:grid-cols-[1.45fr_0.55fr]">
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-slate-100 text-slate-950 shadow-2xl shadow-black/30">
              <div className="border-b border-slate-300 bg-slate-200/70 px-5 py-5 sm:px-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <TicketStatusBadge
                        status={ticket.status}
                      />

                      <span className="font-mono text-[10px] font-black tracking-wide text-slate-500">
                        {ticket.ticketNumber}
                      </span>
                    </div>

                    <h1 className="mt-3 break-words text-2xl font-black tracking-tight sm:text-3xl">
                      {ticket.subject}
                    </h1>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600">
                    <Clock3 className="h-3.5 w-3.5 text-sky-700" />
                    {formatDateTime(
                      ticket.lastActivityAt,
                    )}
                  </div>
                </div>
              </div>

              <div className="flex min-h-[560px] flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
                  {ticket.messages.length ===
                  0 ? (
                    <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                      <MessageSquareText className="h-10 w-10 text-slate-300" />

                      <p className="mt-4 font-black text-slate-800">
                        No messages yet
                      </p>
                    </div>
                  ) : (
                    ticket.messages.map(
                      (message) => (
                        <TicketMessage
                          key={message.id}
                          message={message}
                        />
                      ),
                    )
                  )}
                </div>

                <div className="border-t border-slate-300 bg-slate-200/60 p-4 sm:p-5">
                  {canReply ? (
                    <ClaimantReplyForm />
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-xs font-black text-slate-500">
                      <LockKeyhole className="h-4 w-4" />
                      Replies closed
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-[26px] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/10 text-sky-300">
                    <TicketCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Ticket summary
                    </p>

                    <p className="mt-1 text-sm font-black">
                      {formatEnum(
                        ticket.type,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-2">
                  <SummaryRow
                    label="Claimant"
                    value={
                      ticket.claimantName ??
                      "Not provided"
                    }
                    icon={UserRound}
                  />

                  <SummaryRow
                    label="Reference"
                    value={
                      ticket.claimantReference ??
                      ticket.ticketNumber
                    }
                    icon={FileKey}
                  />

                  <SummaryRow
                    label="Opened"
                    value={formatDateTime(
                      ticket.createdAt,
                    )}
                    icon={Clock3}
                  />

                  <SummaryRow
                    label="Support"
                    value={
                      ticket.assignedTo
                        ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                        : "Unassigned"
                    }
                    icon={ShieldCheck}
                  />
                </div>

                <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04]">
                  <summary className="cursor-pointer list-none px-4 py-3 text-xs font-black text-slate-300">
                    More details
                  </summary>

                  <div className="space-y-2 border-t border-white/10 px-4 py-3 text-xs font-semibold text-slate-400">
                    <p>
                      {maskEmail(
                        ticket.claimantEmail,
                      )}
                    </p>

                    <p>
                      {maskPhone(
                        ticket.claimantPhone,
                      )}
                    </p>

                    {ticket.description ? (
                      <p className="leading-5">
                        {ticket.description}
                      </p>
                    ) : null}
                  </div>
                </details>
              </section>

              <section className="rounded-[26px] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <BadgeCheck
                    className={`h-5 w-5 ${
                      ticket.identityVerifiedAt
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }`}
                  />

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                      Identity
                    </p>

                    <p className="mt-1 text-sm font-black">
                      {ticket.identityVerifiedAt
                        ? "Verified"
                        : latestVerification
                          ? formatEnum(
                              latestVerification.status,
                            )
                          : "Pending"}
                    </p>
                  </div>
                </div>

                {ticket.identityVerifiedAt ? (
                  <p className="mt-3 text-xs font-semibold text-slate-400">
                    {formatDateTime(
                      ticket.identityVerifiedAt,
                    )}
                  </p>
                ) : latestVerification ? (
                  <p className="mt-3 text-xs font-semibold text-slate-400">
                    {formatEnum(
                      latestVerification.method,
                    )}
                  </p>
                ) : null}
              </section>

              <section className="rounded-[26px] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
                {canSetPassword ? (
                  <AuthorizedPasswordAction />
                ) : isResolved ? (
                  <div>
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="h-5 w-5 text-emerald-300" />

                      <p className="text-sm font-black">
                        Ticket completed
                      </p>
                    </div>

                    <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">
                      {ticket.resolutionNote ??
                        "This request has been completed."}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3">
                      <LockKeyhole className="h-5 w-5 text-violet-300" />

                      <p className="text-sm font-black">
                        Secure action pending
                      </p>
                    </div>

                    <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">
                      Follow the latest support message.
                    </p>
                  </div>
                )}
              </section>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function TicketMessage({
  message,
}: {
  message: {
    senderType: string;
    body: string;
    createdAt: Date;
    senderUser: {
      firstName: string;
      lastName: string;
    } | null;
  };
}) {
  const isSystem =
    message.senderType === "SYSTEM";

  const isClaimant =
    message.senderType === "CLAIMANT";

  const senderName = isSystem
    ? "IMTR"
    : isClaimant
      ? "You"
      : message.senderUser
        ? `${message.senderUser.firstName} ${message.senderUser.lastName}`
        : formatEnum(
            message.senderType,
          );

  return (
    <article
      className={`max-w-[88%] rounded-2xl border px-4 py-3 ${
        isClaimant
          ? "ml-auto border-sky-300 bg-sky-100"
          : isSystem
            ? "border-emerald-300 bg-emerald-100"
            : "mr-auto border-slate-300 bg-slate-200/70"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">
          {senderName}
        </p>

        <p className="text-[9px] font-bold text-slate-400">
          {formatDateTime(
            message.createdAt,
          )}
        </p>
      </div>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-800">
        {message.body}
      </p>
    </article>
  );
}

function TicketStatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<
    string,
    string
  > = {
    SUBMITTED:
      "border-sky-300 bg-sky-100 text-sky-800",
    IDENTITY_REVIEW:
      "border-amber-300 bg-amber-100 text-amber-800",
    MORE_INFORMATION_REQUIRED:
      "border-orange-300 bg-orange-100 text-orange-800",
    VERIFIED:
      "border-emerald-300 bg-emerald-100 text-emerald-800",
    RESET_AUTHORIZED:
      "border-violet-300 bg-violet-100 text-violet-800",
    RESOLVED:
      "border-emerald-300 bg-emerald-100 text-emerald-800",
    REJECTED:
      "border-rose-300 bg-rose-100 text-rose-800",
    CLOSED:
      "border-slate-300 bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-wider ${
        styles[status] ??
        "border-slate-300 bg-slate-200 text-slate-700"
      }`}
    >
      {formatEnum(status)}
    </span>
  );
}

function SummaryRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />

      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </p>

        <p className="mt-1 break-words text-xs font-black text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}

function maskEmail(
  value: string | null,
) {
  if (!value) {
    return "Email not provided";
  }

  const [name, domain] =
    value.split("@");

  if (!name || !domain) {
    return "Email protected";
  }

  return `${name.slice(
    0,
    2,
  )}***@${domain}`;
}

function maskPhone(
  value: string | null,
) {
  if (!value) {
    return "Phone not provided";
  }

  return `******${value.slice(-4)}`;
}

function formatEnum(
  value: string,
) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function formatDateTime(
  value: Date | string,
) {
  return new Intl.DateTimeFormat(
    "en-KE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Africa/Nairobi",
    },
  ).format(new Date(value));
}
