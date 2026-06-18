"use client";

import type {
  ElementType,
  FormEvent,
  ReactNode,
} from "react";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Activity,
  ArrowRight,
  CircleUserRound,
  Filter,
  Inbox,
  Loader2,
  MessageSquareText,
  RefreshCcw,
  Search,
  ShieldCheck,
  TicketCheck,
  UserCheck,
  UserRoundSearch,
  Users,
} from "lucide-react";

import { toast } from "sonner";

import { claimAccountRecoveryTicket } from "@/app/actions/ict-account-recovery.actions";

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

type TicketRecord = {
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
    role: string;
  } | null;

  assignedTo: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;

  unreadClaimantMessages: number;
  verificationAttemptCount: number;
};

type AssignmentFilter =
  | "ALL"
  | "UNASSIGNED"
  | "MINE"
  | "OTHERS";

type IctRecoveryTicketInboxProps = {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };

  summary: {
    total: number;
    open: number;
    unassigned: number;
    assignedToMe: number;
    awaitingClaimant: number;
    verified: number;
    completed: number;
    unreadClaimantMessages: number;
  };

  tickets: TicketRecord[];
};

const OPEN_STATUSES = new Set<TicketStatus>([
  "SUBMITTED",
  "IDENTITY_REVIEW",
  "MORE_INFORMATION_REQUIRED",
  "VERIFIED",
  "RESET_AUTHORIZED",
]);

export function IctRecoveryTicketInbox({
  currentUser,
  summary,
  tickets,
}: IctRecoveryTicketInboxProps) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<"ALL" | TicketStatus>("ALL");

  const [typeFilter, setTypeFilter] =
    useState<"ALL" | TicketType>("ALL");

  const [
    assignmentFilter,
    setAssignmentFilter,
  ] = useState<AssignmentFilter>("ALL");

  const [
    activeActionKey,
    setActiveActionKey,
  ] = useState<string | null>(null);

  const [
    isClaiming,
    startClaimTransition,
  ] = useTransition();

  const filteredTickets = useMemo(() => {
    const normalizedQuery = searchQuery
      .trim()
      .toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        !normalizedQuery ||
        ticket.ticketNumber
          .toLowerCase()
          .includes(normalizedQuery) ||
        ticket.subject
          .toLowerCase()
          .includes(normalizedQuery) ||
        ticket.claimantName
          ?.toLowerCase()
          .includes(normalizedQuery) ||
        ticket.claimantEmail
          ?.toLowerCase()
          .includes(normalizedQuery) ||
        ticket.user?.email
          .toLowerCase()
          .includes(normalizedQuery) ||
        `${ticket.user?.firstName ?? ""} ${
          ticket.user?.lastName ?? ""
        }`
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "ALL" ||
        ticket.status === statusFilter;

      const matchesType =
        typeFilter === "ALL" ||
        ticket.type === typeFilter;

      const matchesAssignment =
        assignmentFilter === "ALL" ||
        (assignmentFilter === "UNASSIGNED" &&
          !ticket.assignedTo) ||
        (assignmentFilter === "MINE" &&
          ticket.assignedTo?.id ===
            currentUser.id) ||
        (assignmentFilter === "OTHERS" &&
          ticket.assignedTo &&
          ticket.assignedTo.id !==
            currentUser.id);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesAssignment
      );
    });
  }, [
    assignmentFilter,
    currentUser.id,
    searchQuery,
    statusFilter,
    tickets,
    typeFilter,
  ]);

  const handleClaim = (
    event: FormEvent<HTMLFormElement>,
    ticket: TicketRecord,
  ) => {
    event.preventDefault();

    const formData = new FormData();
    formData.set("ticketId", ticket.id);

    setActiveActionKey(ticket.id);

    startClaimTransition(async () => {
      try {
        const result =
          await claimAccountRecoveryTicket(
            formData,
          );

        if (result.error) {
          toast.error(result.error);
          return;
        }

        toast.success(
          result.message ??
            "Recovery ticket assigned.",
        );

        router.refresh();
      } finally {
        setActiveActionKey(null);
      }
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setAssignmentFilter("ALL");
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 overflow-hidden">
      <section className="relative isolate overflow-hidden rounded-[30px] border border-border bg-[#082f49] text-white shadow-xl shadow-slate-900/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.3),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.2),transparent_38%)]" />

        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10" />

        <div className="relative flex flex-col gap-6 p-5 sm:p-7 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-sky-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              ICT Account Recovery
            </div>

            <h1 className="mt-3 break-words text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              Recovery Ticket Inbox
            </h1>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-300">
              Review account activations, identity
              verification requests and secure password
              recovery cases.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <HeroStat
              label="Open"
              value={summary.open}
            />

            <HeroStat
              label="Unassigned"
              value={summary.unassigned}
            />

            <HeroStat
              label="Unread"
              value={
                summary.unreadClaimantMessages
              }
            />
          </div>
        </div>

        <div className="relative grid border-t border-white/10 bg-black/10 sm:grid-cols-3">
          <HeroDetail
            label="Signed-in Support Officer"
            value={currentUser.name}
          />

          <HeroDetail
            label="Portal Role"
            value={formatEnum(
              currentUser.role,
            )}
          />

          <HeroDetail
            label="Assigned to You"
            value={`${summary.assignedToMe} active tickets`}
          />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Inbox}
          label="Open Tickets"
          value={summary.open}
          helper="Require support action"
          tone="sky"
        />

        <SummaryCard
          icon={UserRoundSearch}
          label="Unassigned"
          value={summary.unassigned}
          helper="Waiting for an officer"
          tone="amber"
        />

        <SummaryCard
          icon={MessageSquareText}
          label="Unread Messages"
          value={
            summary.unreadClaimantMessages
          }
          helper="Claimant replies awaiting review"
          tone="violet"
        />

        <SummaryCard
          icon={TicketCheck}
          label="Completed"
          value={summary.completed}
          helper="Resolved, rejected or closed"
          tone="emerald"
        />
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h2 className="font-black text-foreground">
                  Support Requests
                </h2>

                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {filteredTickets.length} of{" "}
                  {tickets.length} tickets displayed
                </p>
              </div>
            </div>

            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary">
              Secure Account Help Workflow
            </span>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_210px_190px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <input
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }
                type="search"
                placeholder="Search ticket, claimant or email..."
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm font-semibold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>

            <FilterSelect
              icon={Filter}
              value={statusFilter}
              onChange={(value) =>
                setStatusFilter(
                  value as
                    | "ALL"
                    | TicketStatus,
                )
              }
              label="Status"
              options={[
                ["ALL", "All statuses"],
                ["SUBMITTED", "Submitted"],
                [
                  "IDENTITY_REVIEW",
                  "Identity review",
                ],
                [
                  "MORE_INFORMATION_REQUIRED",
                  "More information",
                ],
                ["VERIFIED", "Verified"],
                [
                  "RESET_AUTHORIZED",
                  "Reset authorised",
                ],
                ["RESOLVED", "Resolved"],
                ["REJECTED", "Rejected"],
                ["CLOSED", "Closed"],
              ]}
            />

            <FilterSelect
              icon={TicketCheck}
              value={typeFilter}
              onChange={(value) =>
                setTypeFilter(
                  value as "ALL" | TicketType,
                )
              }
              label="Type"
              options={[
                ["ALL", "All request types"],
                [
                  "NEW_ACCOUNT_ACTIVATION",
                  "New account activation",
                ],
                [
                  "PASSWORD_RECOVERY",
                  "Password recovery",
                ],
                [
                  "LOST_CONTACT_ACCESS",
                  "Lost contact access",
                ],
                [
                  "LOCKED_ACCOUNT",
                  "Locked account",
                ],
                ["OTHER", "Other"],
              ]}
            />

            <FilterSelect
              icon={Users}
              value={assignmentFilter}
              onChange={(value) =>
                setAssignmentFilter(
                  value as AssignmentFilter,
                )
              }
              label="Assignment"
              options={[
                ["ALL", "All assignments"],
                [
                  "UNASSIGNED",
                  "Unassigned",
                ],
                ["MINE", "Assigned to me"],
                [
                  "OTHERS",
                  "Assigned to others",
                ],
              ]}
            />

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-xs font-black text-foreground transition-colors hover:bg-muted"
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <EmptyTickets />
        ) : (
          <div className="space-y-4 p-4 sm:p-5">
            {filteredTickets.map(
              (ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  currentUserId={
                    currentUser.id
                  }
                  claiming={
                    isClaiming &&
                    activeActionKey ===
                      ticket.id
                  }
                  onClaim={(event) =>
                    handleClaim(
                      event,
                      ticket,
                    )
                  }
                />
              ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function TicketCard({
  ticket,
  currentUserId,
  claiming,
  onClaim,
}: {
  ticket: TicketRecord;
  currentUserId: string;
  claiming: boolean;
  onClaim: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
}) {
  const isOpen = OPEN_STATUSES.has(
    ticket.status,
  );

  const isAssignedToCurrentUser =
    ticket.assignedTo?.id ===
    currentUserId;

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-background transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <TicketCheck className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words font-black text-foreground">
                {ticket.subject}
              </h3>

              <TicketStatusBadge
                status={ticket.status}
              />

              {ticket.unreadClaimantMessages >
              0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-violet-700">
                  <MessageSquareText className="h-3 w-3" />
                  {
                    ticket.unreadClaimantMessages
                  }{" "}
                  Unread
                </span>
              ) : null}
            </div>

            <p className="mt-1 font-mono text-xs font-black tracking-wide text-primary">
              {ticket.ticketNumber}
            </p>

            <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-muted-foreground">
              {ticket.description ??
                "No additional description was provided."}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Tag>
                {formatEnum(ticket.type)}
              </Tag>

              <Tag>
                {ticket.identityVerifiedAt
                  ? "Identity verified"
                  : `${ticket.verificationAttemptCount} verification attempts`}
              </Tag>

              {ticket.user ? (
                <Tag>
                  Account:{" "}
                  {formatEnum(
                    ticket.user.accountStatus,
                  )}
                </Tag>
              ) : (
                <Tag>
                  Unlinked account
                </Tag>
              )}
            </div>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[520px]">
          <TicketDetail
            label="Claimant"
            value={
              ticket.claimantName ??
              (ticket.user
                ? `${ticket.user.firstName} ${ticket.user.lastName}`
                : "Not provided")
            }
          />

          <TicketDetail
            label="Assigned To"
            value={
              ticket.assignedTo
                ? ticket.assignedTo.name
                : "Unassigned"
            }
          />

          <TicketDetail
            label="Opened"
            value={formatDate(
              ticket.createdAt,
            )}
          />

          <TicketDetail
            label="Last Activity"
            value={formatDateTime(
              ticket.lastActivityAt,
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <CircleUserRound className="h-4 w-4" />

          {ticket.assignedTo ? (
            <span>
              {isAssignedToCurrentUser
                ? "Assigned to you"
                : `Assigned to ${ticket.assignedTo.name}`}
            </span>
          ) : (
            <span>
              Awaiting support assignment
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {!ticket.assignedTo && isOpen ? (
            <form onSubmit={onClaim}>
              <button
                type="submit"
                disabled={claiming}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {claiming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}

                Claim Ticket
              </button>
            </form>
          ) : null}

          <Link
            href={`/ict-admin/tickets/${ticket.id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Open Ticket
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function FilterSelect({
  icon: Icon,
  value,
  onChange,
  label,
  options,
}: {
  icon: ElementType;
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: Array<
    readonly [string, string]
  >;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        aria-label={label}
        className="h-11 w-full appearance-none rounded-xl border border-input bg-background pl-10 pr-3 text-sm font-bold outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
      >
        {options.map(
          ([optionValue, optionLabel]) => (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          ),
        )}
      </select>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: number;
  helper: string;
  tone:
    | "sky"
    | "amber"
    | "violet"
    | "emerald";
}) {
  const tones = {
    sky: "bg-sky-500/10 text-sky-700",
    amber:
      "bg-amber-500/10 text-amber-700",
    violet:
      "bg-violet-500/10 text-violet-700",
    emerald:
      "bg-emerald-500/10 text-emerald-700",
  };

  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-foreground">
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        {helper}
      </p>
    </article>
  );
}

function TicketStatusBadge({
  status,
}: {
  status: TicketStatus;
}) {
  const styles: Record<
    TicketStatus,
    string
  > = {
    SUBMITTED:
      "border-sky-500/20 bg-sky-500/10 text-sky-700",
    IDENTITY_REVIEW:
      "border-amber-500/20 bg-amber-500/10 text-amber-700",
    MORE_INFORMATION_REQUIRED:
      "border-orange-500/20 bg-orange-500/10 text-orange-700",
    VERIFIED:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    RESET_AUTHORIZED:
      "border-violet-500/20 bg-violet-500/10 text-violet-700",
    RESOLVED:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    REJECTED:
      "border-rose-500/20 bg-rose-500/10 text-rose-700",
    CLOSED:
      "border-slate-500/20 bg-slate-500/10 text-slate-700",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${styles[status]}`}
    >
      {formatEnum(status)}
    </span>
  );
}

function TicketDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2">
      <p className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 line-clamp-2 text-[11px] font-black text-foreground">
        {value}
      </p>
    </div>
  );
}

function Tag({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[100px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center">
      <p className="text-2xl font-black text-white">
        {value}
      </p>

      <p className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-white/60">
        {label}
      </p>
    </div>
  );
}

function HeroDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-white/10 px-5 py-4 sm:border-r sm:last:border-r-0">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-white/90">
        {value}
      </p>
    </div>
  );
}

function EmptyTickets() {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <Inbox className="h-10 w-10" />
      </div>

      <p className="mt-5 text-xl font-black text-foreground">
        No matching tickets
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
        Adjust the search term or filters to
        display additional recovery requests.
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "en-KE",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Nairobi",
    },
  ).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(
    "en-KE",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    },
  ).format(new Date(value));
}
