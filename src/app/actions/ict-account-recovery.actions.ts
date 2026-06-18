"use server";

import {
  IdentityVerificationMethod,
  IdentityVerificationStatus,
  RecoveryMessageSender,
  RecoveryTicketStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type RecoveryTicketActionResult = {
  success?: boolean;
  message?: string;
  error?: string;
};

type AuthorizedSupportUser = {
  id: string;
  firstName: string;
  lastName: string;
  role: "ict_admin" | "super_admin";
};

type TicketWorkflowAction =
  | "START_REVIEW"
  | "REQUEST_INFORMATION"
  | "RESUME_REVIEW"
  | "VERIFY_IDENTITY"
  | "AUTHORIZE_ACCOUNT_ACTION"
  | "REJECT"
  | "RESOLVE"
  | "CLOSE";

const OPEN_TICKET_STATUSES: RecoveryTicketStatus[] = [
  RecoveryTicketStatus.SUBMITTED,
  RecoveryTicketStatus.IDENTITY_REVIEW,
  RecoveryTicketStatus.MORE_INFORMATION_REQUIRED,
  RecoveryTicketStatus.VERIFIED,
  RecoveryTicketStatus.RESET_AUTHORIZED,
];

async function getAuthorizedSupportUser(): Promise<{
  user: AuthorizedSupportUser | null;
  error: string | null;
}> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      user: null,
      error: "You must be signed in.",
    };
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      isActive: true,
      accountStatus: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user || !user.isActive || user.accountStatus !== "ACTIVE") {
    return {
      user: null,
      error:
        "Your support account was not found, is inactive, or is not fully activated.",
    };
  }

  if (user.role.name !== "ict_admin" && user.role.name !== "super_admin") {
    return {
      user: null,
      error:
        "Only ICT Administrators and Super Administrators can manage account-recovery tickets.",
    };
  }

  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role.name,
    },
    error: null,
  };
}

export async function claimAccountRecoveryTicket(
  formData: FormData,
): Promise<RecoveryTicketActionResult> {
  const ticketId = String(formData.get("ticketId") ?? "").trim();

  if (!ticketId) {
    return {
      error: "Missing recovery-ticket information.",
    };
  }

  const authorization = await getAuthorizedSupportUser();

  if (!authorization.user) {
    return {
      error: authorization.error ?? "You are not authorized.",
    };
  }

  const supportUser = authorization.user;

  try {
    const ticket = await prisma.accountRecoveryTicket.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
        ticketNumber: true,
        userId: true,
        status: true,
        assignedToId: true,
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!ticket) {
      return {
        error: "The selected recovery ticket was not found.",
      };
    }

    if (!OPEN_TICKET_STATUSES.includes(ticket.status)) {
      return {
        error: "This ticket is already completed and cannot be claimed.",
      };
    }

    if (ticket.assignedToId && ticket.assignedToId !== supportUser.id) {
      return {
        error: `This ticket is already assigned to ${
          ticket.assignedTo
            ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
            : "another support officer"
        }.`,
      };
    }

    if (ticket.assignedToId === supportUser.id) {
      return {
        error: "This ticket is already assigned to you.",
      };
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.accountRecoveryTicket.update({
        where: {
          id: ticket.id,
        },
        data: {
          assignedToId: supportUser.id,
          status:
            ticket.status === RecoveryTicketStatus.SUBMITTED
              ? RecoveryTicketStatus.IDENTITY_REVIEW
              : ticket.status,
          lastActivityAt: new Date(),
        },
      });

      await transaction.recoveryTicketMessage.create({
        data: {
          ticketId: ticket.id,
          senderType:
            supportUser.role === "super_admin"
              ? RecoveryMessageSender.SUPER_ADMIN
              : RecoveryMessageSender.ICT_ADMIN,
          senderUserId: supportUser.id,
          body: `${supportUser.firstName} ${supportUser.lastName} has started reviewing this request.`,
          isInternal: false,
          readByStaffAt: new Date(),
        },
      });

      await transaction.securityAuditLog.create({
        data: {
          action: "RECOVERY_TICKET_CLAIMED",
          outcome: "SUCCESS",
          actorUserId: supportUser.id,
          targetUserId: ticket.userId,
          ticketId: ticket.id,
          metadata: {
            previousStatus: ticket.status,
            newStatus:
              ticket.status === RecoveryTicketStatus.SUBMITTED
                ? RecoveryTicketStatus.IDENTITY_REVIEW
                : ticket.status,
            source: "ICT_ACCOUNT_HELP",
          },
        },
      });
    });

    revalidateRecoveryTicketPages(ticket.id);

    return {
      success: true,
      message: `${ticket.ticketNumber} is now assigned to you.`,
    };
  } catch (error) {
    console.error("[claimAccountRecoveryTicket]", error);

    return {
      error: "The recovery ticket could not be assigned. Please try again.",
    };
  }
}

export async function postAccountRecoveryStaffMessage(
  formData: FormData,
): Promise<RecoveryTicketActionResult> {
  const ticketId = String(formData.get("ticketId") ?? "").trim();

  const body = normalizeMessage(String(formData.get("message") ?? ""));

  const isInternal = String(formData.get("isInternal") ?? "") === "true";

  if (!ticketId) {
    return {
      error: "Missing recovery-ticket information.",
    };
  }

  if (!body) {
    return {
      error: "Enter a message before sending.",
    };
  }

  if (body.length > 3000) {
    return {
      error: "The message must not exceed 3,000 characters.",
    };
  }

  if (containsSensitiveCredential(body)) {
    return {
      error:
        "Do not place passwords, private access codes, or reset tokens in ticket messages.",
    };
  }

  const authorization = await getAuthorizedSupportUser();

  if (!authorization.user) {
    return {
      error: authorization.error ?? "You are not authorized.",
    };
  }

  const supportUser = authorization.user;

  try {
    const ticket = await prisma.accountRecoveryTicket.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
        ticketNumber: true,
        userId: true,
        status: true,
        assignedToId: true,
      },
    });

    if (!ticket) {
      return {
        error: "The selected recovery ticket was not found.",
      };
    }

    const assignmentError = getAssignmentError(
      ticket.assignedToId,
      supportUser,
    );

    if (assignmentError) {
      return {
        error: assignmentError,
      };
    }

    if (
      ticket.status === RecoveryTicketStatus.CLOSED ||
      ticket.status === RecoveryTicketStatus.REJECTED
    ) {
      return {
        error: "This ticket no longer accepts support messages.",
      };
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.recoveryTicketMessage.create({
        data: {
          ticketId: ticket.id,
          senderType:
            supportUser.role === "super_admin"
              ? RecoveryMessageSender.SUPER_ADMIN
              : RecoveryMessageSender.ICT_ADMIN,
          senderUserId: supportUser.id,
          body,
          isInternal,
          readByStaffAt: new Date(),
        },
      });

      await transaction.accountRecoveryTicket.update({
        where: {
          id: ticket.id,
        },
        data: {
          lastActivityAt: new Date(),
        },
      });

      await transaction.securityAuditLog.create({
        data: {
          action: isInternal
            ? "RECOVERY_TICKET_INTERNAL_NOTE_CREATED"
            : "RECOVERY_TICKET_STAFF_MESSAGE_CREATED",
          outcome: "SUCCESS",
          actorUserId: supportUser.id,
          targetUserId: ticket.userId,
          ticketId: ticket.id,
          metadata: {
            messageLength: body.length,
            ticketStatus: ticket.status,
            source: "ICT_ACCOUNT_HELP",
          },
        },
      });
    });

    revalidateRecoveryTicketPages(ticket.id);

    return {
      success: true,
      message: isInternal
        ? "Internal support note added."
        : "Message sent to the claimant.",
    };
  } catch (error) {
    console.error("[postAccountRecoveryStaffMessage]", error);

    return {
      error: "The support message could not be sent.",
    };
  }
}

export async function updateAccountRecoveryTicketWorkflow(
  formData: FormData,
): Promise<RecoveryTicketActionResult> {
  const ticketId = String(formData.get("ticketId") ?? "").trim();

  const action = String(
    formData.get("action") ?? "",
  ).trim() as TicketWorkflowAction;

  const note = normalizeMessage(String(formData.get("note") ?? ""));

  if (!ticketId) {
    return {
      error: "Missing recovery-ticket information.",
    };
  }

  if (!isTicketWorkflowAction(action)) {
    return {
      error: "The requested ticket action is invalid.",
    };
  }

  if (["REQUEST_INFORMATION", "REJECT"].includes(action) && note.length < 5) {
    return {
      error: "Provide a clear explanation before completing this action.",
    };
  }

  if (note.length > 3000) {
    return {
      error: "The workflow note must not exceed 3,000 characters.",
    };
  }

  if (containsSensitiveCredential(note)) {
    return {
      error:
        "Do not place passwords, private access codes, or reset tokens in workflow notes.",
    };
  }

  const authorization = await getAuthorizedSupportUser();

  if (!authorization.user) {
    return {
      error: authorization.error ?? "You are not authorized.",
    };
  }

  const supportUser = authorization.user;

  try {
    const ticket = await prisma.accountRecoveryTicket.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
        ticketNumber: true,
        userId: true,
        type: true,
        status: true,
        assignedToId: true,
        identityVerifiedAt: true,
      },
    });

    if (!ticket) {
      return {
        error: "The selected recovery ticket was not found.",
      };
    }

    const assignmentError = getAssignmentError(
      ticket.assignedToId,
      supportUser,
    );

    if (assignmentError) {
      return {
        error: assignmentError,
      };
    }

    if (action === "AUTHORIZE_ACCOUNT_ACTION" && !ticket.userId) {
      return {
        error:
          "This ticket is not linked to a portal account and cannot receive a secure password action.",
      };
    }

    const transition = getWorkflowTransition(ticket.status, action);

    if (!transition) {
      return {
        error: `The action ${formatEnum(
          action,
        )} is not allowed while this ticket is ${formatEnum(ticket.status)}.`,
      };
    }

    await prisma.$transaction(async (transaction) => {
      const now = new Date();

      await transaction.accountRecoveryTicket.update({
        where: {
          id: ticket.id,
        },
        data: {
          status: transition.nextStatus,
          lastActivityAt: now,

          identityVerifiedAt:
            action === "VERIFY_IDENTITY" ? now : ticket.identityVerifiedAt,

          verifiedById:
            action === "VERIFY_IDENTITY" ? supportUser.id : undefined,

          resolutionNote:
            action === "REJECT" || action === "RESOLVE"
              ? note || transition.defaultMessage
              : undefined,

          resolvedById: action === "RESOLVE" ? supportUser.id : undefined,

          resolvedAt: action === "RESOLVE" ? now : undefined,

          closedAt: action === "CLOSE" ? now : undefined,
        },
      });

      if (action === "VERIFY_IDENTITY") {
        await transaction.identityVerificationAttempt.create({
          data: {
            ticketId: ticket.id,
            method: IdentityVerificationMethod.MANUAL_ICT_REVIEW,
            status: IdentityVerificationStatus.PASSED,
          },
        });
      }

      await transaction.recoveryTicketMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: RecoveryMessageSender.SYSTEM,
          body: note
            ? `${transition.defaultMessage}\n\nSupport note: ${note}`
            : transition.defaultMessage,
          isInternal: transition.internalOnly,
        },
      });

      await transaction.securityAuditLog.create({
        data: {
          action: transition.auditAction,
          outcome: "SUCCESS",
          actorUserId: supportUser.id,
          targetUserId: ticket.userId,
          ticketId: ticket.id,
          metadata: {
            previousStatus: ticket.status,
            newStatus: transition.nextStatus,
            ticketType: ticket.type,
            source: "ICT_ACCOUNT_HELP",
          },
        },
      });
    });

    revalidateRecoveryTicketPages(ticket.id);

    return {
      success: true,
      message: transition.successMessage,
    };
  } catch (error) {
    console.error("[updateAccountRecoveryTicketWorkflow]", error);

    return {
      error: "The ticket workflow could not be updated. Please try again.",
    };
  }
}

function getAssignmentError(
  assignedToId: string | null,
  supportUser: AuthorizedSupportUser,
) {
  if (!assignedToId) {
    return "Claim this ticket before performing support actions.";
  }

  if (assignedToId !== supportUser.id && supportUser.role !== "super_admin") {
    return "This ticket is assigned to another ICT support officer.";
  }

  return null;
}

function getWorkflowTransition(
  currentStatus: RecoveryTicketStatus,
  action: TicketWorkflowAction,
): {
  nextStatus: RecoveryTicketStatus;
  defaultMessage: string;
  successMessage: string;
  auditAction: string;
  internalOnly: boolean;
} | null {
  if (
    action === "START_REVIEW" &&
    currentStatus === RecoveryTicketStatus.SUBMITTED
  ) {
    return {
      nextStatus: RecoveryTicketStatus.IDENTITY_REVIEW,
      defaultMessage: "ICT has started reviewing your account-support request.",
      successMessage: "Identity review started.",
      auditAction: "RECOVERY_TICKET_REVIEW_STARTED",
      internalOnly: false,
    };
  }

  if (
    action === "REQUEST_INFORMATION" &&
    statusIsOneOf(currentStatus, [
      RecoveryTicketStatus.SUBMITTED,
      RecoveryTicketStatus.IDENTITY_REVIEW,
    ])
  ) {
    return {
      nextStatus: RecoveryTicketStatus.MORE_INFORMATION_REQUIRED,
      defaultMessage:
        "ICT needs additional information before the request can continue.",
      successMessage: "The claimant has been asked for more information.",
      auditAction: "RECOVERY_TICKET_MORE_INFORMATION_REQUESTED",
      internalOnly: false,
    };
  }

  if (
    action === "RESUME_REVIEW" &&
    currentStatus === RecoveryTicketStatus.MORE_INFORMATION_REQUIRED
  ) {
    return {
      nextStatus: RecoveryTicketStatus.IDENTITY_REVIEW,
      defaultMessage:
        "ICT has resumed identity review after receiving additional information.",
      successMessage: "Identity review resumed.",
      auditAction: "RECOVERY_TICKET_REVIEW_RESUMED",
      internalOnly: false,
    };
  }

  if (
    action === "VERIFY_IDENTITY" &&
    statusIsOneOf(currentStatus, [
      RecoveryTicketStatus.IDENTITY_REVIEW,
      RecoveryTicketStatus.MORE_INFORMATION_REQUIRED,
    ])
  ) {
    return {
      nextStatus: RecoveryTicketStatus.VERIFIED,
      defaultMessage:
        "Your identity has been verified successfully. ICT will now authorize the secure account action.",
      successMessage: "Claimant identity verified.",
      auditAction: "RECOVERY_TICKET_IDENTITY_VERIFIED",
      internalOnly: false,
    };
  }

  if (
    action === "AUTHORIZE_ACCOUNT_ACTION" &&
    currentStatus === RecoveryTicketStatus.VERIFIED
  ) {
    return {
      nextStatus: RecoveryTicketStatus.RESET_AUTHORIZED,
      defaultMessage:
        "ICT has authorised the secure account action. Open this ticket and select Set New Password to continue. The action is time-limited and can be used only once.",
      successMessage: "Secure account action authorised.",
      auditAction: "RECOVERY_TICKET_ACCOUNT_ACTION_AUTHORIZED",
      internalOnly: false,
    };
  }

  if (
    action === "REJECT" &&
    statusIsOneOf(currentStatus, [
      RecoveryTicketStatus.SUBMITTED,
      RecoveryTicketStatus.IDENTITY_REVIEW,
      RecoveryTicketStatus.MORE_INFORMATION_REQUIRED,
      RecoveryTicketStatus.VERIFIED,
    ])
  ) {
    return {
      nextStatus: RecoveryTicketStatus.REJECTED,
      defaultMessage: "This account-support request has been rejected.",
      successMessage: "Recovery ticket rejected.",
      auditAction: "RECOVERY_TICKET_REJECTED",
      internalOnly: false,
    };
  }

  if (
    action === "RESOLVE" &&
    currentStatus === RecoveryTicketStatus.RESET_AUTHORIZED
  ) {
    return {
      nextStatus: RecoveryTicketStatus.RESOLVED,
      defaultMessage: "This account-support request has been resolved.",
      successMessage: "Recovery ticket resolved.",
      auditAction: "RECOVERY_TICKET_RESOLVED",
      internalOnly: false,
    };
  }

  if (
    action === "CLOSE" &&
    statusIsOneOf(currentStatus, [
      RecoveryTicketStatus.RESOLVED,
      RecoveryTicketStatus.REJECTED,
    ])
  ) {
    return {
      nextStatus: RecoveryTicketStatus.CLOSED,
      defaultMessage: "This account-support ticket has been closed.",
      successMessage: "Recovery ticket closed.",
      auditAction: "RECOVERY_TICKET_CLOSED",
      internalOnly: false,
    };
  }

  return null;
}

function statusIsOneOf(
  currentStatus: RecoveryTicketStatus,
  allowedStatuses: readonly RecoveryTicketStatus[],
) {
  return allowedStatuses.includes(currentStatus);
}

function revalidateRecoveryTicketPages(ticketId: string) {
  revalidatePath("/ict-admin/tickets");
  revalidatePath(`/ict-admin/tickets/${ticketId}`);
  revalidatePath("/account-help/ticket");
  revalidatePath("/super-admin");
}

function normalizeMessage(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

function containsSensitiveCredential(value: string) {
  if (!value) {
    return false;
  }

  const patterns = [
    /\b(?:current|old|new|temporary)\s+password\s*[:=-]\s*\S+/i,
    /\bpassword\s*[:=-]\s*\S+/i,
    /\bprivate\s+access\s+code\s*[:=-]\s*\d{6}\b/i,
    /\baccess\s+code\s*[:=-]\s*\d{6}\b/i,
    /\breset\s+token\s*[:=-]\s*\S+/i,
  ];

  return patterns.some((pattern) => pattern.test(value));
}

function isTicketWorkflowAction(value: string): value is TicketWorkflowAction {
  return [
    "START_REVIEW",
    "REQUEST_INFORMATION",
    "RESUME_REVIEW",
    "VERIFY_IDENTITY",
    "AUTHORIZE_ACCOUNT_ACTION",
    "REJECT",
    "RESOLVE",
    "CLOSE",
  ].includes(value);
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
