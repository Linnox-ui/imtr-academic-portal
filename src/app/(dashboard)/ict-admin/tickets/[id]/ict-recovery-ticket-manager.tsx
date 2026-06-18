"use client";

import type { ElementType, FormEvent, ReactNode } from "react";

import { useMemo, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  CircleUserRound,
  ClipboardCheck,
  Clock3,
  FileKey,
  FileText,
  Loader2,
  LockKeyhole,
  MessageSquareText,
  NotebookPen,
  RefreshCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserRoundSearch,
  XCircle,
  KeyRound,
} from "lucide-react";

import { toast } from "sonner";

import {
  claimAccountRecoveryTicket,
  postAccountRecoveryStaffMessage,
  updateAccountRecoveryTicketWorkflow,
} from "@/app/actions/ict-account-recovery.actions";

type TicketStatus =
  | "SUBMITTED"
  | "IDENTITY_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "VERIFIED"
  | "RESET_AUTHORIZED"
  | "RESOLVED"
  | "REJECTED"
  | "CLOSED";

type TicketType =
  | "NEW_ACCOUNT_ACTIVATION"
  | "PASSWORD_RECOVERY"
  | "LOST_CONTACT_ACCESS"
  | "LOCKED_ACCOUNT"
  | "OTHER";

type TicketWorkflowAction =
  | "START_REVIEW"
  | "REQUEST_INFORMATION"
  | "RESUME_REVIEW"
  | "VERIFY_IDENTITY"
  | "AUTHORIZE_ACCOUNT_ACTION"
  | "REJECT"
  | "RESOLVE"
  | "CLOSE";

type TicketData = {
  id: string;
  ticketNumber: string;
  type: TicketType;
  status: TicketStatus;
  subject: string;
  description: string | null;
  claimantName: string | null;
  claimantEmail: string | null;
  claimantPhone: string | null;
  claimantReference: string | null;
  identityVerifiedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  resolvedAt: string | null;
  closedAt: string | null;

  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    accountStatus: string;
    requiresPasswordChange: boolean;
    role: string;

    identityProfile: {
      nationalIdLast4: string | null;
      dateOfBirth: string | null;
      phone: string | null;
      staffNumber: string | null;
      emailVerified: boolean;
      phoneVerified: boolean;
    } | null;

    studentProfile: {
      admissionNumber: string;
      academicStatus: string;
      intake: {
        code: string;
        title: string;
        course: {
          code: string;
          title: string;
        };
      };
    } | null;
  } | null;

  assignedTo: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;

  verifiedBy: {
    id: string;
    name: string;
  } | null;

  resolvedBy: {
    id: string;
    name: string;
  } | null;

  messages: Array<{
    id: string;
    senderType: string;
    body: string;
    isInternal: boolean;
    readByClaimantAt: string | null;
    readByStaffAt: string | null;
    createdAt: string;
    updatedAt: string;

    senderUser: {
      id: string;
      name: string;
      role: string;
    } | null;
  }>;

  verificationAttempts: Array<{
    id: string;
    method: string;
    status: string;
    dateOfBirthMatched: boolean | null;
    emailMatched: boolean | null;
    phoneMatched: boolean | null;
    failureReason: string | null;
    createdAt: string;
  }>;

  auditLogs: Array<{
    id: string;
    action: string;
    outcome: string;
    metadata: unknown;
    createdAt: string;

    actor: {
      name: string;
      role: string;
    } | null;
  }>;
};

type IctRecoveryTicketManagerProps = {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };

  ticket: TicketData;
};

const CLOSED_STATUSES = new Set<TicketStatus>(["REJECTED", "CLOSED"]);

export function IctRecoveryTicketManager({
  currentUser,
  ticket,
}: IctRecoveryTicketManagerProps) {
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  const [workflowNote, setWorkflowNote] = useState("");

  const [activeAction, setActiveAction] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const isAssignedToCurrentUser = ticket.assignedTo?.id === currentUser.id;

  const canManageAssignedTicket =
    isAssignedToCurrentUser || currentUser.role === "super_admin";

  const canSendMessages =
    canManageAssignedTicket && !CLOSED_STATUSES.has(ticket.status);

  const visibleWorkflowActions = useMemo(
    () => getWorkflowActions(ticket.status),
    [ticket.status],
  );

  const runAction = (
    actionKey: string,
    operation: () => Promise<{
      success?: boolean;
      message?: string;
      error?: string;
    }>,
    onSuccess?: () => void,
  ) => {
    setActiveAction(actionKey);

    startTransition(async () => {
      try {
        const result = await operation();

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success(result.message ?? "Ticket updated successfully.");

        onSuccess?.();
        router.refresh();
      } finally {
        setActiveAction(null);
      }
    });
  };

  const handleClaim = () => {
    const formData = new FormData();
    formData.set("ticketId", ticket.id);

    runAction("CLAIM", () => claimAccountRecoveryTicket(formData));
  };

  const handleMessageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedMessage = message.trim();

    if (!normalizedMessage) {
      toast.error("Enter a message before sending.");
      return;
    }

    const formData = new FormData();
    formData.set("ticketId", ticket.id);
    formData.set("message", normalizedMessage);
    formData.set("isInternal", String(isInternal));

    runAction(
      "SEND_MESSAGE",
      () => postAccountRecoveryStaffMessage(formData),
      () => {
        setMessage("");
        setIsInternal(false);
      },
    );
  };

  const handleWorkflowAction = (action: TicketWorkflowAction) => {
    const actionDefinition = WORKFLOW_ACTIONS[action];

    const note = workflowNote.trim();

    if (actionDefinition.requiresNote && note.length < 5) {
      toast.error("Provide a clear note before completing this action.");
      return;
    }

    const confirmed = window.confirm(
      `${actionDefinition.label}?\n\n${actionDefinition.confirmation}`,
    );

    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("ticketId", ticket.id);
    formData.set("action", action);
    formData.set("note", note);

    runAction(
      `WORKFLOW-${action}`,
      () => updateAccountRecoveryTicketWorkflow(formData),
      () => setWorkflowNote(""),
    );
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 overflow-hidden">
      <div>
        <Link
          href="/ict-admin/tickets"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-black text-foreground shadow-sm transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Recovery Ticket Inbox
        </Link>
      </div>

      <section className="relative isolate overflow-hidden rounded-[30px] border border-border bg-[#082f49] text-white shadow-xl shadow-slate-900/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.3),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.2),transparent_38%)]" />

        <div className="relative flex flex-col gap-6 p-5 sm:p-7 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-sky-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              ICT Secure Support Workspace
            </div>

            <h1 className="mt-3 break-words text-2xl font-black tracking-tight sm:text-3xl">
              {ticket.subject}
            </h1>

            <p className="mt-2 font-mono text-sm font-black tracking-wide text-sky-200">
              {ticket.ticketNumber}
            </p>

            {ticket.description ? (
              <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-slate-300">
                {ticket.description}
              </p>
            ) : null}
          </div>

          <TicketStatusBadge status={ticket.status} />
        </div>

        <div className="relative grid border-t border-white/10 bg-black/10 sm:grid-cols-2 xl:grid-cols-4">
          <HeroDetail label="Request Type" value={formatEnum(ticket.type)} />

          <HeroDetail
            label="Assigned Officer"
            value={ticket.assignedTo?.name ?? "Unassigned"}
          />

          <HeroDetail label="Opened" value={formatDateTime(ticket.createdAt)} />

          <HeroDetail
            label="Last Activity"
            value={formatDateTime(ticket.lastActivityAt)}
          />
        </div>
      </section>

      {!ticket.assignedTo && !CLOSED_STATUSES.has(ticket.status) ? (
        <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <UserRoundSearch className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <div>
                <p className="font-black text-amber-800">
                  This ticket is unassigned
                </p>

                <p className="mt-1 text-sm font-semibold leading-6 text-amber-700">
                  Claim it before replying or changing its workflow status.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClaim}
              disabled={isPending}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 text-xs font-black text-white transition-colors hover:bg-amber-800 disabled:opacity-60"
            >
              {activeAction === "CLAIM" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="h-4 w-4" />
              )}
              Claim Ticket
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="space-y-5">
          <Panel
            icon={CircleUserRound}
            title="Account Holder"
            subtitle="Portal account and claimant information."
          >
            <div className="grid gap-3">
              <DetailCard
                label="Claimant Name"
                value={
                  ticket.claimantName ??
                  getUserName(ticket.user) ??
                  "Not provided"
                }
              />

              <DetailCard
                label="Claimant Email"
                value={
                  ticket.claimantEmail ?? ticket.user?.email ?? "Not provided"
                }
              />

              <DetailCard
                label="Claimant Phone"
                value={
                  ticket.claimantPhone ??
                  ticket.user?.identityProfile?.phone ??
                  "Not provided"
                }
              />

              <DetailCard
                label="Claimant Reference"
                value={ticket.claimantReference ?? "Not provided"}
              />

              {ticket.user ? (
                <>
                  <DetailCard
                    label="Portal Role"
                    value={formatEnum(ticket.user.role)}
                  />

                  <DetailCard
                    label="Account Status"
                    value={`${formatEnum(ticket.user.accountStatus)} · ${
                      ticket.user.isActive ? "Login enabled" : "Login disabled"
                    }`}
                  />
                </>
              ) : null}
            </div>
          </Panel>

          <Panel
            icon={ClipboardCheck}
            title="Identity Records"
            subtitle="Use these records carefully during manual verification."
          >
            {ticket.user ? (
              <div className="grid gap-3">
                <DetailCard
                  label="National ID"
                  value={
                    ticket.user.identityProfile?.nationalIdLast4
                      ? `Ending in ${ticket.user.identityProfile.nationalIdLast4}`
                      : "Not recorded"
                  }
                />

                <DetailCard
                  label="Date of Birth"
                  value={
                    ticket.user.identityProfile?.dateOfBirth
                      ? formatDate(ticket.user.identityProfile.dateOfBirth)
                      : "Not recorded"
                  }
                />

                <DetailCard
                  label="Staff Number"
                  value={
                    ticket.user.identityProfile?.staffNumber ?? "Not recorded"
                  }
                />

                <DetailCard
                  label="Registered Contact"
                  value={[
                    ticket.user.identityProfile?.emailVerified
                      ? "Email verified"
                      : "Email unverified",
                    ticket.user.identityProfile?.phoneVerified
                      ? "Phone verified"
                      : "Phone unverified",
                  ].join(" · ")}
                />

                {ticket.user.studentProfile ? (
                  <>
                    <DetailCard
                      label="Admission Number"
                      value={ticket.user.studentProfile.admissionNumber}
                    />

                    <DetailCard
                      label="Student Programme"
                      value={`${ticket.user.studentProfile.intake.course.code} · ${ticket.user.studentProfile.intake.course.title}`}
                    />

                    <DetailCard
                      label="Intake"
                      value={`${ticket.user.studentProfile.intake.code} · ${ticket.user.studentProfile.intake.title}`}
                    />
                  </>
                ) : null}
              </div>
            ) : (
              <EmptyPanelMessage text="This recovery ticket is not linked to a portal account." />
            )}
          </Panel>

          <Panel
            icon={BadgeCheck}
            title="Verification History"
            subtitle="Recorded identity-verification attempts."
          >
            {ticket.verificationAttempts.length > 0 ? (
              <div className="space-y-3">
                {ticket.verificationAttempts.map((attempt) => (
                  <article
                    key={attempt.id}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-foreground">
                        {formatEnum(attempt.method)}
                      </p>

                      <StatusPill
                        positive={attempt.status === "PASSED"}
                        label={formatEnum(attempt.status)}
                      />
                    </div>

                    <p className="mt-2 text-xs font-semibold text-muted-foreground">
                      {formatDateTime(attempt.createdAt)}
                    </p>

                    {attempt.failureReason ? (
                      <p className="mt-2 text-xs font-semibold leading-5 text-rose-700">
                        {attempt.failureReason}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyPanelMessage text="No identity-verification attempt has been recorded." />
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel
            icon={MessageSquareText}
            title="Ticket Conversation"
            subtitle="Public claimant messages and ICT-only internal notes."
          >
            <div className="max-h-[650px] space-y-4 overflow-y-auto pr-1">
              {ticket.messages.length > 0 ? (
                ticket.messages.map((message) => (
                  <TicketMessage key={message.id} message={message} />
                ))
              ) : (
                <EmptyPanelMessage text="No messages have been posted." />
              )}
            </div>

            <div className="mt-5 border-t border-border pt-5">
              {canSendMessages ? (
                <form onSubmit={handleMessageSubmit} className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label
                      htmlFor="staff-message"
                      className="text-sm font-black text-foreground"
                    >
                      Support message
                    </label>

                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-black text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(event) =>
                          setIsInternal(event.target.checked)
                        }
                        className="h-4 w-4 rounded border-border"
                      />
                      ICT-only internal note
                    </label>
                  </div>

                  <textarea
                    required
                    id="staff-message"
                    rows={5}
                    maxLength={3000}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    disabled={isPending}
                    placeholder={
                      isInternal
                        ? "Add a private note for ICT staff..."
                        : "Write a secure message to the claimant..."
                    }
                    className="w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm font-semibold leading-6 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
                  />

                  <div
                    className={`rounded-2xl border p-3.5 ${
                      isInternal
                        ? "border-amber-500/20 bg-amber-500/5 text-amber-700"
                        : "border-sky-500/20 bg-sky-500/5 text-sky-700"
                    }`}
                  >
                    <p className="text-xs font-semibold leading-5">
                      {isInternal
                        ? "Internal notes are visible only to authorised ICT and Super Admin users."
                        : "This message will be visible to the claimant in the Account Help Centre."}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending || message.trim().length < 2}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                  >
                    {activeAction === "SEND_MESSAGE" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isInternal ? (
                      <NotebookPen className="h-4 w-4" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}

                    {isInternal ? "Add Internal Note" : "Send to Claimant"}
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-sm font-black text-amber-800">
                    Support actions unavailable
                  </p>

                  <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                    Claim this ticket first, or reopen it through an authorised
                    workflow.
                  </p>
                </div>
              )}
            </div>
          </Panel>

          <Panel
            icon={FileKey}
            title="Workflow Controls"
            subtitle="Move the request through identity review and resolution."
          >
            {canManageAssignedTicket ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="workflow-note"
                    className="text-sm font-black text-foreground"
                  >
                    Workflow note
                  </label>

                  <textarea
                    id="workflow-note"
                    rows={4}
                    maxLength={3000}
                    value={workflowNote}
                    onChange={(event) => setWorkflowNote(event.target.value)}
                    disabled={isPending}
                    placeholder="Explain requested information, verification evidence, rejection reason or resolution..."
                    className="w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm font-semibold leading-6 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-60"
                  />
                </div>

                {visibleWorkflowActions.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {visibleWorkflowActions.map((action) => {
                      const definition = WORKFLOW_ACTIONS[action];

                      const Icon = definition.icon;

                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => handleWorkflowAction(action)}
                          disabled={isPending}
                          className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black transition-all disabled:opacity-60 ${definition.className}`}
                        >
                          {activeAction === `WORKFLOW-${action}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}

                          {definition.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyPanelMessage text="No workflow action is currently available for this ticket status." />
                )}

                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />

                    <p className="text-xs font-semibold leading-5 text-rose-700">
                      Never place passwords, private access codes or reset
                      tokens in workflow notes or messages.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyPanelMessage text="This ticket is assigned to another ICT support officer." />
            )}
          </Panel>

          <Panel
            icon={Activity}
            title="Security Audit"
            subtitle="Recent recorded actions for this ticket."
          >
            {ticket.auditLogs.length > 0 ? (
              <div className="space-y-3">
                {ticket.auditLogs.map((log) => (
                  <article
                    key={log.id}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-black text-foreground">
                        {formatEnum(log.action)}
                      </p>

                      <StatusPill
                        positive={log.outcome === "SUCCESS"}
                        label={log.outcome}
                      />
                    </div>

                    <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
                      {log.actor
                        ? `${log.actor.name} · ${formatEnum(log.actor.role)}`
                        : "System or claimant action"}
                    </p>

                    <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyPanelMessage text="No audit events are available for this ticket." />
            )}
          </Panel>
        </div>
      </section>

      <section className="rounded-3xl border border-primary/15 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

          <div>
            <p className="font-black text-foreground">
              Protected recovery workflow
            </p>

            <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
              Every assignment, message, verification decision and status change
              is recorded in the security audit history.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

const WORKFLOW_ACTIONS: Record<
  TicketWorkflowAction,
  {
    label: string;
    confirmation: string;
    requiresNote: boolean;
    icon: ElementType;
    className: string;
  }
> = {
  START_REVIEW: {
    label: "Start Identity Review",
    confirmation:
      "The claimant will be informed that identity review has started.",
    requiresNote: false,
    icon: UserRoundSearch,
    className:
      "border-sky-500/20 bg-sky-500/10 text-sky-700 hover:bg-sky-500/15",
  },

  REQUEST_INFORMATION: {
    label: "Request More Information",
    confirmation:
      "The claimant will be asked to provide the information in your workflow note.",
    requiresNote: true,
    icon: FileText,
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15",
  },

  RESUME_REVIEW: {
    label: "Resume Identity Review",
    confirmation: "The ticket will return to active identity review.",
    requiresNote: false,
    icon: RefreshCcw,
    className:
      "border-sky-500/20 bg-sky-500/10 text-sky-700 hover:bg-sky-500/15",
  },

  VERIFY_IDENTITY: {
    label: "Verify Identity",
    confirmation:
      "Confirm that sufficient evidence proves the claimant is the legitimate account holder.",
    requiresNote: false,
    icon: BadgeCheck,
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15",
  },

  AUTHORIZE_ACCOUNT_ACTION: {
    label: "Authorize Secure Password",
    confirmation:
      "The claimant will receive a one-time Set New Password action inside the secure ticket workspace.",
    requiresNote: false,
    icon: KeyRound,
    className:
      "border-violet-500/20 bg-violet-500/10 text-violet-700 hover:bg-violet-500/15",
  },

  REJECT: {
    label: "Reject Request",
    confirmation:
      "The ticket will be rejected and claimant replies will be disabled.",
    requiresNote: true,
    icon: XCircle,
    className:
      "border-rose-500/20 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15",
  },

  RESOLVE: {
    label: "Resolve Ticket",
    confirmation:
      "Use this after the claimant has successfully completed the secure account action.",
    requiresNote: false,
    icon: CheckCircle2,
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15",
  },

  CLOSE: {
    label: "Close Ticket",
    confirmation: "The completed ticket will be closed permanently.",
    requiresNote: false,
    icon: LockKeyhole,
    className:
      "border-slate-500/20 bg-slate-500/10 text-slate-700 hover:bg-slate-500/15",
  },
};

function getWorkflowActions(status: TicketStatus): TicketWorkflowAction[] {
  switch (status) {
    case "SUBMITTED":
      return ["START_REVIEW", "REQUEST_INFORMATION", "REJECT"];

    case "IDENTITY_REVIEW":
      return ["REQUEST_INFORMATION", "VERIFY_IDENTITY", "REJECT"];

    case "MORE_INFORMATION_REQUIRED":
      return ["RESUME_REVIEW", "VERIFY_IDENTITY", "REJECT"];

    case "VERIFIED":
      return ["AUTHORIZE_ACCOUNT_ACTION"];

    case "RESET_AUTHORIZED":
      return ["RESOLVE"];

    case "RESOLVED":
    case "REJECTED":
      return ["CLOSE"];

    case "CLOSED":
      return [];
  }
}

function Panel({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: ElementType;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/40 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-black text-foreground">{title}</h2>

            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function TicketMessage({
  message,
}: {
  message: TicketData["messages"][number];
}) {
  const isInternal = message.isInternal;
  const isClaimant = message.senderType === "CLAIMANT";
  const isSystem = message.senderType === "SYSTEM";

  const sender = isSystem
    ? "IMTR Account Help Centre"
    : isClaimant
      ? "Claimant"
      : (message.senderUser?.name ?? formatEnum(message.senderType));

  return (
    <article
      className={`rounded-2xl border p-4 ${
        isInternal
          ? "border-amber-500/20 bg-amber-500/5"
          : isClaimant
            ? "mr-8 border-violet-500/20 bg-violet-500/5"
            : isSystem
              ? "border-sky-500/20 bg-sky-500/5"
              : "ml-8 border-border bg-background"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-black text-foreground">{sender}</p>

          {isInternal ? (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-amber-700">
              Internal
            </span>
          ) : null}
        </div>

        <p className="text-[10px] font-semibold text-muted-foreground">
          {formatDateTime(message.createdAt)}
        </p>
      </div>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-foreground/80">
        {message.body}
      </p>
    </article>
  );
}

function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    SUBMITTED: "border-sky-300/30 bg-sky-300/10 text-sky-100",
    IDENTITY_REVIEW: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    MORE_INFORMATION_REQUIRED:
      "border-orange-300/30 bg-orange-300/10 text-orange-100",
    VERIFIED: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    RESET_AUTHORIZED: "border-violet-300/30 bg-violet-300/10 text-violet-100",
    RESOLVED: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    REJECTED: "border-rose-300/30 bg-rose-300/10 text-rose-100",
    CLOSED: "border-slate-300/30 bg-slate-300/10 text-slate-100",
  };

  return (
    <span
      className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-wider ${styles[status]}`}
    >
      <Clock3 className="h-3.5 w-3.5" />
      {formatEnum(status)}
    </span>
  );
}

function HeroDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-white/10 px-5 py-4 sm:border-r sm:last:border-r-0">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black text-white/90">
        {value}
      </p>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-black text-foreground">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ positive, label }: { positive: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
        positive
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
          : "border-rose-500/20 bg-rose-500/10 text-rose-700"
      }`}
    >
      {label}
    </span>
  );
}

function EmptyPanelMessage({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-muted-foreground" />

      <p className="mt-2 text-xs font-semibold leading-5 text-muted-foreground">
        {text}
      </p>
    </div>
  );
}

function getUserName(user: TicketData["user"]) {
  if (!user) {
    return null;
  }

  return `${user.firstName} ${user.lastName}`;
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));
}
