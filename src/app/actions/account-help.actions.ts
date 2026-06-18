"use server";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import {
  AccountStatus,
  RecoveryMessageSender,
  RecoveryTicketStatus,
  RecoveryTicketType,
  RecoveryTokenPurpose,
} from "@prisma/client";
import { compare, hash as hashPassword } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  clearAccountHelpTicketSession,
  getAccountHelpTicketSession,
  setAccountHelpTicketSession,
} from "@/lib/account-help-ticket-session";
import {
  clearAccountRecoveryActionSession,
  getAccountRecoveryActionSession,
  hashAccountRecoveryToken,
  setAccountRecoveryActionSession,
} from "@/lib/account-recovery-action-session";
import { prisma } from "@/lib/prisma";

export type TicketAccessResult = {
  success?: boolean;
  message?: string;
  error?: string;
  redirectTo?: string;
};

const MAX_FAILED_ATTEMPTS = 8;
const RATE_LIMIT_MINUTES = 15;

const MAX_CLAIMANT_MESSAGES = 5;
const MESSAGE_RATE_LIMIT_MINUTES = 2;
const MAX_MESSAGE_LENGTH = 2000;

const CLAIMANT_REPLY_STATUSES: RecoveryTicketStatus[] = [
  RecoveryTicketStatus.SUBMITTED,
  RecoveryTicketStatus.IDENTITY_REVIEW,
  RecoveryTicketStatus.MORE_INFORMATION_REQUIRED,
  RecoveryTicketStatus.VERIFIED,
  RecoveryTicketStatus.RESET_AUTHORIZED,
];

export async function verifyRecoveryTicketAccess(
  formData: FormData,
): Promise<TicketAccessResult> {
  const ticketNumber = String(formData.get("ticketNumber") ?? "")
    .trim()
    .toUpperCase();

  const privateAccessCode = String(
    formData.get("privateAccessCode") ?? "",
  ).trim();

  const genericError =
    "We could not verify those ticket details. Check the reference and private access code.";

  if (!ticketNumber || !privateAccessCode) {
    return {
      error: "Enter your ticket number and private access code.",
    };
  }

  if (!/^IMTR-(ACT|REC)-\d{4}-\d{6}$/.test(ticketNumber)) {
    return {
      error: genericError,
    };
  }

  if (!/^\d{6}$/.test(privateAccessCode)) {
    return {
      error: genericError,
    };
  }

  const requestContext = await getRequestContext();

  try {
    const failedAttempts = await prisma.securityAuditLog.count({
      where: {
        action: "RECOVERY_TICKET_ACCESS_FAILED",
        ipHash: requestContext.ipHash,
        createdAt: {
          gte: new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000),
        },
      },
    });

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      await clearAccountHelpTicketSession();

      return {
        error:
          "Too many unsuccessful attempts. Wait before trying again or contact IMTR ICT.",
      };
    }

    const ticket = await prisma.accountRecoveryTicket.findUnique({
      where: {
        ticketNumber,
      },
      select: {
        id: true,
        ticketNumber: true,
        accessCodeHash: true,
        userId: true,
        status: true,
      },
    });

    const accessCodeIsValid = ticket
      ? await compare(privateAccessCode, ticket.accessCodeHash)
      : false;

    if (!ticket || !accessCodeIsValid) {
      await clearAccountHelpTicketSession();

      await prisma.securityAuditLog.create({
        data: {
          action: "RECOVERY_TICKET_ACCESS_FAILED",
          outcome: "DENIED",
          ticketId: ticket?.id ?? null,
          targetUserId: ticket?.userId ?? null,
          ipHash: requestContext.ipHash,
          userAgent: requestContext.userAgent,
          metadata: {
            reason: "INVALID_TICKET_CREDENTIALS",
          },
        },
      });

      return {
        error: genericError,
      };
    }

    await setAccountHelpTicketSession({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
    });

    await prisma.securityAuditLog.create({
      data: {
        action: "RECOVERY_TICKET_ACCESS_GRANTED",
        outcome: "SUCCESS",
        ticketId: ticket.id,
        targetUserId: ticket.userId,
        ipHash: requestContext.ipHash,
        userAgent: requestContext.userAgent,
        metadata: {
          ticketStatus: ticket.status,
        },
      },
    });

    return {
      success: true,
      redirectTo: "/account-help/ticket",
    };
  } catch (error) {
    console.error("[verifyRecoveryTicketAccess]", error);

    return {
      error:
        "The Account Help Centre could not verify the ticket. Please try again.",
    };
  }
}

export async function postClaimantTicketMessage(
  formData: FormData,
): Promise<TicketAccessResult> {
  const body = normalizeMessage(String(formData.get("message") ?? ""));

  if (!body) {
    return {
      error: "Enter a message before sending.",
    };
  }

  if (body.length < 2) {
    return {
      error: "Your message is too short.",
    };
  }

  if (body.length > MAX_MESSAGE_LENGTH) {
    return {
      error: `Your message must not exceed ${MAX_MESSAGE_LENGTH} characters.`,
    };
  }

  if (containsSensitiveCredential(body)) {
    return {
      error:
        "Do not include a password or private access code in support messages.",
    };
  }

  const ticketSession = await getAccountHelpTicketSession();

  if (!ticketSession) {
    return {
      error: "Your secure ticket session has expired. Verify the ticket again.",
      redirectTo: "/account-help/track",
    };
  }

  const requestContext = await getRequestContext();

  try {
    const ticket = await prisma.accountRecoveryTicket.findFirst({
      where: {
        id: ticketSession.ticketId,
        ticketNumber: ticketSession.ticketNumber,
      },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!ticket) {
      await clearAccountHelpTicketSession();

      return {
        error:
          "The support ticket could not be found. Verify the ticket again.",
        redirectTo: "/account-help/track",
      };
    }

    if (!CLAIMANT_REPLY_STATUSES.includes(ticket.status)) {
      return {
        error:
          "This ticket no longer accepts claimant messages because it has been completed or closed.",
      };
    }

    const recentMessageCount = await prisma.recoveryTicketMessage.count({
      where: {
        ticketId: ticket.id,
        senderType: RecoveryMessageSender.CLAIMANT,
        createdAt: {
          gte: new Date(Date.now() - MESSAGE_RATE_LIMIT_MINUTES * 60 * 1000),
        },
      },
    });

    if (recentMessageCount >= MAX_CLAIMANT_MESSAGES) {
      return {
        error:
          "Too many messages were sent in a short time. Wait briefly before sending another message.",
      };
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.recoveryTicketMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: RecoveryMessageSender.CLAIMANT,
          body,
          isInternal: false,
          readByClaimantAt: new Date(),
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
          action: "RECOVERY_TICKET_CLAIMANT_MESSAGE_CREATED",
          outcome: "SUCCESS",
          ticketId: ticket.id,
          targetUserId: ticket.userId,
          ipHash: requestContext.ipHash,
          userAgent: requestContext.userAgent,
          metadata: {
            messageLength: body.length,
            ticketStatus: ticket.status,
          },
        },
      });
    });

    revalidatePath("/account-help/ticket");
    revalidatePath("/ict-admin/tickets");

    return {
      success: true,
      message: "Your message was sent to IMTR ICT support.",
    };
  } catch (error) {
    console.error("[postClaimantTicketMessage]", error);

    return {
      error: "Your message could not be sent. Please try again.",
    };
  }
}

export async function beginAuthorizedPasswordAction(): Promise<TicketAccessResult> {
  const ticketSession = await getAccountHelpTicketSession();

  if (!ticketSession) {
    return {
      error: "Your secure ticket session has expired. Verify the ticket again.",
      redirectTo: "/account-help/track",
    };
  }

  try {
    const ticket = await prisma.accountRecoveryTicket.findFirst({
      where: {
        id: ticketSession.ticketId,
        ticketNumber: ticketSession.ticketNumber,
      },
      select: {
        id: true,
        ticketNumber: true,
        type: true,
        status: true,
        userId: true,
        user: {
          select: {
            id: true,
            accountStatus: true,
          },
        },
      },
    });

    if (!ticket || !ticket.userId || !ticket.user) {
      await clearAccountRecoveryActionSession();

      return {
        error: "This ticket is not linked to an eligible portal account.",
      };
    }

    if (ticket.status !== RecoveryTicketStatus.RESET_AUTHORIZED) {
      await clearAccountRecoveryActionSession();

      return {
        error: "The secure password action has not been authorized by ICT.",
      };
    }

    const userId = ticket.userId;

    const rawToken = randomBytes(32).toString("base64url");

    const tokenHash = hashAccountRecoveryToken(rawToken);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const purpose =
      ticket.type === RecoveryTicketType.NEW_ACCOUNT_ACTIVATION
        ? RecoveryTokenPurpose.ACCOUNT_ACTIVATION
        : RecoveryTokenPurpose.PASSWORD_RESET;

    const token = await prisma.$transaction(async (transaction) => {
      const now = new Date();

      await transaction.accountRecoveryToken.updateMany({
        where: {
          userId,
          ticketId: ticket.id,
          usedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      const createdToken = await transaction.accountRecoveryToken.create({
        data: {
          userId,
          ticketId: ticket.id,
          purpose,
          tokenHash,
          expiresAt,
        },
        select: {
          id: true,
        },
      });

      await transaction.securityAuditLog.create({
        data: {
          action: "ACCOUNT_RECOVERY_ACTION_SESSION_CREATED",
          outcome: "SUCCESS",
          targetUserId: userId,
          ticketId: ticket.id,
          metadata: {
            purpose,
            expiresAt: expiresAt.toISOString(),
            source: "ACCOUNT_HELP_CLAIMANT_WORKSPACE",
          },
        },
      });

      return createdToken;
    });

    await setAccountRecoveryActionSession({
      tokenId: token.id,
      rawToken,
      ticketId: ticket.id,
      userId,
    });

    return {
      success: true,
      redirectTo: "/account-help/set-password",
    };
  } catch (error) {
    console.error("[beginAuthorizedPasswordAction]", error);

    return {
      error:
        "The secure password action could not be opened. Please try again.",
    };
  }
}

export async function completeAuthorizedPasswordAction(
  formData: FormData,
): Promise<TicketAccessResult> {
  const password = String(formData.get("password") ?? "");

  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const passwordError = validateNewPassword(password);

  if (passwordError) {
    return {
      error: passwordError,
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "The password confirmation does not match.",
    };
  }

  const actionSession = await getAccountRecoveryActionSession();

  if (!actionSession) {
    return {
      error:
        "Your secure password session has expired. Open the authorised action from your ticket again.",
      redirectTo: "/account-help/track",
    };
  }

  try {
    const token = await prisma.accountRecoveryToken.findUnique({
      where: {
        id: actionSession.tokenId,
      },
      select: {
        id: true,
        userId: true,
        ticketId: true,
        purpose: true,
        tokenHash: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            accountStatus: true,
          },
        },
      },
    });

    if (
      !token ||
      !token.ticket ||
      token.userId !== actionSession.userId ||
      token.ticketId !== actionSession.ticketId ||
      token.ticket.id !== actionSession.ticketId
    ) {
      await clearAccountRecoveryActionSession();

      return {
        error: "The secure password authorization is invalid.",
        redirectTo: "/account-help/track",
      };
    }
    const recoveryTicket = token.ticket;

    const expectedTokenHash = hashAccountRecoveryToken(actionSession.rawToken);

    if (
      !safeEqualText(token.tokenHash, expectedTokenHash) ||
      token.usedAt ||
      token.revokedAt ||
      token.expiresAt <= new Date() ||
      token.ticket.status !== RecoveryTicketStatus.RESET_AUTHORIZED
    ) {
      await clearAccountRecoveryActionSession();

      return {
        error:
          "The secure password authorization has expired or has already been used.",
        redirectTo: "/account-help/track",
      };
    }

    const passwordHash = await hashPassword(password, 12);

    const now = new Date();

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: {
          id: token.userId,
        },
        data: {
          password: passwordHash,
          isActive: true,
          accountStatus: AccountStatus.ACTIVE,
          requiresPasswordChange: false,
        },
      });

      await transaction.accountRecoveryToken.update({
        where: {
          id: token.id,
        },
        data: {
          usedAt: now,
        },
      });

      await transaction.accountRecoveryToken.updateMany({
        where: {
          userId: token.userId,
          id: {
            not: token.id,
          },
          usedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      const resolutionMessage =
        token.purpose === RecoveryTokenPurpose.ACCOUNT_ACTIVATION
          ? "Your portal account has been activated and your private password has been created successfully."
          : "Your portal password has been changed successfully.";

      await transaction.accountRecoveryTicket.update({
        where: {
          id: recoveryTicket.id,
        },
        data: {
          status: RecoveryTicketStatus.RESOLVED,
          resolutionNote: resolutionMessage,
          resolvedAt: now,
          lastActivityAt: now,
        },
      });

      await transaction.recoveryTicketMessage.create({
        data: {
          ticketId: recoveryTicket.id,
          senderType: RecoveryMessageSender.SYSTEM,
          body: `${resolutionMessage} You can now sign in to the IMTR Academic Portal.`,
          isInternal: false,
        },
      });

      await transaction.securityAuditLog.create({
        data: {
          action:
            token.purpose === RecoveryTokenPurpose.ACCOUNT_ACTIVATION
              ? "PORTAL_ACCOUNT_ACTIVATION_COMPLETED"
              : "PORTAL_PASSWORD_RECOVERY_COMPLETED",
          outcome: "SUCCESS",
          targetUserId: token.userId,
          ticketId: recoveryTicket.id,
          metadata: {
            purpose: token.purpose,
            previousAccountStatus: token.user.accountStatus,
            newAccountStatus: AccountStatus.ACTIVE,
            source: "ACCOUNT_HELP_SET_PASSWORD",
          },
        },
      });
    });

    await clearAccountRecoveryActionSession();
    await clearAccountHelpTicketSession();

    revalidatePath("/account-help/ticket");
    revalidatePath("/ict-admin/tickets");
    revalidatePath(`/ict-admin/tickets/${recoveryTicket.id}`);
    revalidatePath("/super-admin/users");

    return {
      success: true,
      message:
        token.purpose === RecoveryTokenPurpose.ACCOUNT_ACTIVATION
          ? "Your account has been activated successfully."
          : "Your password has been changed successfully.",
      redirectTo: "/login?recovery=success",
    };
  } catch (error) {
    console.error("[completeAuthorizedPasswordAction]", error);

    return {
      error: "The password could not be saved. Please try again.",
    };
  }
}

export async function closeTicketAccessSession(): Promise<TicketAccessResult> {
  await clearAccountRecoveryActionSession();
  await clearAccountHelpTicketSession();

  return {
    success: true,
    redirectTo: "/account-help",
  };
}

async function getRequestContext() {
  const requestHeaders = await headers();

  const forwardedFor = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();

  const realIp = requestHeaders.get("x-real-ip");

  const rawIp = forwardedFor || realIp || "unknown";

  const userAgent = requestHeaders.get("user-agent")?.slice(0, 300) ?? null;

  return {
    ipHash: hashSensitiveValue(rawIp),
    userAgent,
  };
}

function hashSensitiveValue(value: string) {
  const secret = process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET or BETTER_AUTH_SECRET is required.");
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

function validateNewPassword(password: string) {
  if (password.length < 10) {
    return "Use at least 10 characters.";
  }

  if (password.length > 128) {
    return "The password is too long.";
  }

  if (!/[a-z]/.test(password)) {
    return "Include at least one lowercase letter.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Include at least one uppercase letter.";
  }

  if (!/\d/.test(password)) {
    return "Include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Include at least one symbol.";
  }

  return null;
}

function safeEqualText(first: string, second: string) {
  const firstBuffer = Buffer.from(first);

  const secondBuffer = Buffer.from(second);

  return (
    firstBuffer.length === secondBuffer.length &&
    timingSafeEqual(firstBuffer, secondBuffer)
  );
}

function normalizeMessage(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

function containsSensitiveCredential(value: string) {
  const patterns = [
    /\b(?:current|old|new|temporary)\s+password\s*[:=-]\s*\S+/i,
    /\bpassword\s*[:=-]\s*\S+/i,
    /\bprivate\s+access\s+code\s*[:=-]\s*\d{6}\b/i,
    /\baccess\s+code\s*[:=-]\s*\d{6}\b/i,
  ];

  return patterns.some((pattern) => pattern.test(value));
}
