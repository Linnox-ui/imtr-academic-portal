"use server";

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import {
  AccountStatus,
  IdentityVerificationMethod,
  IdentityVerificationStatus,
  RecoveryMessageSender,
  RecoveryTicketStatus,
  RecoveryTicketType,
  RecoveryTokenPurpose,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  hashAccountRecoveryToken,
  setAccountRecoveryActionSession,
} from "@/lib/account-recovery-action-session";
import { prisma } from "@/lib/prisma";

export type StaffActivationResult = {
  success?: boolean;
  error?: string;
  redirectTo?: string;
};

const MAX_FAILED_ATTEMPTS = 8;
const RATE_LIMIT_MINUTES = 15;
const ACTION_DURATION_MINUTES = 15;

export async function verifyStaffIdentityAndBeginActivation(
  formData: FormData,
): Promise<StaffActivationResult> {
  const staffNumber = normalizeStaffNumber(
    String(formData.get("staffNumber") ?? ""),
  );

  const nationalId = normalizeNationalId(
    String(formData.get("nationalId") ?? ""),
  );

  const dateOfBirthInput = String(
    formData.get("dateOfBirth") ?? "",
  ).trim();

  const genericMismatchError =
    "The details did not match the staff record. Check the staff number, identity number and date of birth.";

  if (!isValidStaffNumber(staffNumber)) {
    return {
      error:
        "Enter a valid staff number, for example IMTR/STF/2026/001.",
    };
  }

  if (!isValidNationalId(nationalId)) {
    return {
      error:
        "Enter the National ID or passport number used during account registration.",
    };
  }

  const dateOfBirth = parseDateOfBirth(
    dateOfBirthInput,
  );

  if (!dateOfBirth) {
    return {
      error: "Enter a valid date of birth.",
    };
  }

  const requestContext =
    await getRequestContext();

  try {
    const recentFailures =
      await prisma.securityAuditLog.count({
        where: {
          action:
            "SELF_SERVICE_ACTIVATION_FAILED",
          ipHash: requestContext.ipHash,
          createdAt: {
            gte: new Date(
              Date.now() -
                RATE_LIMIT_MINUTES *
                  60 *
                  1000,
            ),
          },
        },
      });

    if (
      recentFailures >= MAX_FAILED_ATTEMPTS
    ) {
      return {
        error:
          "Too many unsuccessful attempts. Wait before trying again or use Account Help support.",
      };
    }

    const identityProfile =
      await prisma.userIdentityProfile.findUnique({
        where: {
          staffNumber,
        },
        select: {
          id: true,
          nationalIdHash: true,
          dateOfBirth: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              isActive: true,
              accountStatus: true,
            },
          },
        },
      });

    const submittedNationalIdHash =
      hashNationalId(nationalId);

    const nationalIdMatches =
      Boolean(
        identityProfile?.nationalIdHash,
      ) &&
      safeEqualText(
        identityProfile!.nationalIdHash!,
        submittedNationalIdHash,
      );

    const dateOfBirthMatches =
      Boolean(identityProfile?.dateOfBirth) &&
      formatDateOnly(
        identityProfile!.dateOfBirth!,
      ) === dateOfBirthInput;

    const activationTicket =
      identityProfile
        ? await prisma.accountRecoveryTicket.findFirst(
            {
              where: {
                userId:
                  identityProfile.user.id,
                type:
                  RecoveryTicketType.NEW_ACCOUNT_ACTIVATION,
              },
              orderBy: {
                createdAt: "desc",
              },
              select: {
                id: true,
                ticketNumber: true,
                status: true,
              },
            },
          )
        : null;

    if (
      !identityProfile ||
      !nationalIdMatches ||
      !dateOfBirthMatches
    ) {
      await recordFailedActivation({
        ticketId:
          activationTicket?.id ?? null,
        userId:
          identityProfile?.user.id ?? null,
        identifierHash:
          submittedNationalIdHash,
        dateOfBirthMatched:
          identityProfile
            ? dateOfBirthMatches
            : null,
        requestContext,
      });

      return {
        error: genericMismatchError,
      };
    }

    const account = identityProfile.user;

    if (
      account.accountStatus ===
        AccountStatus.ACTIVE &&
      account.isActive
    ) {
      return {
        error:
          "This account is already active. Sign in with your email and password, or use account recovery if you have forgotten the password.",
      };
    }

    if (
      account.accountStatus !==
      AccountStatus.PENDING_ACTIVATION
    ) {
      return {
        error:
          "This account cannot be activated automatically in its current state. Use Account Help support.",
      };
    }

    if (!activationTicket) {
      return {
        error:
          "The activation request could not be found. Contact IMTR support.",
      };
    }

    if (
      activationTicket.status ===
        RecoveryTicketStatus.REJECTED ||
      activationTicket.status ===
        RecoveryTicketStatus.CLOSED
    ) {
      return {
        error:
          "This activation request requires support review. Open Account Help support.",
      };
    }

    const userId = account.id;
    const ticketId = activationTicket.id;

    const rawToken =
      randomBytes(32).toString("base64url");

    const tokenHash =
      hashAccountRecoveryToken(rawToken);

    const expiresAt = new Date(
      Date.now() +
        ACTION_DURATION_MINUTES *
          60 *
          1000,
    );

    const token = await prisma.$transaction(
      async (transaction) => {
        const now = new Date();

        await transaction.accountRecoveryToken.updateMany(
          {
            where: {
              userId,
              usedAt: null,
              revokedAt: null,
            },
            data: {
              revokedAt: now,
            },
          },
        );

        const createdToken =
          await transaction.accountRecoveryToken.create(
            {
              data: {
                userId,
                ticketId,
                purpose:
                  RecoveryTokenPurpose.ACCOUNT_ACTIVATION,
                tokenHash,
                expiresAt,
              },
              select: {
                id: true,
              },
            },
          );

        await transaction.accountRecoveryTicket.update({
          where: {
            id: ticketId,
          },
          data: {
            status:
              RecoveryTicketStatus.RESET_AUTHORIZED,
            identityVerifiedAt: now,
            lastActivityAt: now,
          },
        });

        await transaction.identityVerificationAttempt.create(
          {
            data: {
              ticketId,
              method:
                IdentityVerificationMethod.IDENTITY_RECORD_MATCH,
              status:
                IdentityVerificationStatus.PASSED,
              identifierHash:
                submittedNationalIdHash,
              dateOfBirthMatched: true,
            },
          },
        );

        await transaction.recoveryTicketMessage.create({
          data: {
            ticketId,
            senderType:
              RecoveryMessageSender.SYSTEM,
            body:
              "Your identity details matched the registered staff record. You may now create your private portal password.",
            isInternal: false,
          },
        });

        await transaction.securityAuditLog.create({
          data: {
            action:
              "SELF_SERVICE_ACTIVATION_VERIFIED",
            outcome: "SUCCESS",
            targetUserId: userId,
            ticketId,
            ipHash:
              requestContext.ipHash,
            userAgent:
              requestContext.userAgent,
            metadata: {
              staffNumber,
              verificationMethod:
                IdentityVerificationMethod.IDENTITY_RECORD_MATCH,
              nextStatus:
                RecoveryTicketStatus.RESET_AUTHORIZED,
              expiresAt:
                expiresAt.toISOString(),
              source:
                "SELF_SERVICE_ACCOUNT_ACTIVATION",
            },
          },
        });

        return createdToken;
      },
    );

    await setAccountRecoveryActionSession({
      tokenId: token.id,
      rawToken,
      ticketId,
      userId,
    });

    revalidatePath("/account-help/ticket");
    revalidatePath("/ict-admin/tickets");
    revalidatePath(
      `/ict-admin/tickets/${ticketId}`,
    );
    revalidatePath("/super-admin/users");

    return {
      success: true,
      redirectTo:
        "/account-help/set-password",
    };
  } catch (error) {
    console.error(
      "[verifyStaffIdentityAndBeginActivation]",
      error,
    );

    return {
      error:
        "The account could not be verified. Please try again.",
    };
  }
}

async function recordFailedActivation({
  ticketId,
  userId,
  identifierHash,
  dateOfBirthMatched,
  requestContext,
}: {
  ticketId: string | null;
  userId: string | null;
  identifierHash: string;
  dateOfBirthMatched: boolean | null;
  requestContext: {
    ipHash: string;
    userAgent: string | null;
  };
}) {
  await prisma.$transaction(
    async (transaction) => {
      if (ticketId) {
        await transaction.identityVerificationAttempt.create(
          {
            data: {
              ticketId,
              method:
                IdentityVerificationMethod.IDENTITY_RECORD_MATCH,
              status:
                IdentityVerificationStatus.FAILED,
              identifierHash,
              dateOfBirthMatched,
              failureReason:
                "IDENTITY_RECORD_MISMATCH",
            },
          },
        );
      }

      await transaction.securityAuditLog.create({
        data: {
          action:
            "SELF_SERVICE_ACTIVATION_FAILED",
          outcome: "DENIED",
          targetUserId: userId,
          ticketId,
          ipHash:
            requestContext.ipHash,
          userAgent:
            requestContext.userAgent,
          metadata: {
            reason:
              "IDENTITY_RECORD_MISMATCH",
            source:
              "SELF_SERVICE_ACCOUNT_ACTIVATION",
          },
        },
      });
    },
  );
}

async function getRequestContext() {
  const requestHeaders = await headers();

  const forwardedFor =
    requestHeaders
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();

  const realIp =
    requestHeaders.get("x-real-ip");

  const rawIp =
    forwardedFor ||
    realIp ||
    "unknown";

  return {
    ipHash: hashSensitiveValue(rawIp),
    userAgent:
      requestHeaders
        .get("user-agent")
        ?.slice(0, 300) ?? null,
  };
}

function getIdentitySecret() {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET or BETTER_AUTH_SECRET is required.",
    );
  }

  return secret;
}

function hashNationalId(
  nationalId: string,
) {
  return createHmac(
    "sha256",
    getIdentitySecret(),
  )
    .update(
      `IMTR_STAFF_IDENTITY:${nationalId}`,
    )
    .digest("hex");
}

function hashSensitiveValue(
  value: string,
) {
  return createHmac(
    "sha256",
    getIdentitySecret(),
  )
    .update(value)
    .digest("hex");
}

function normalizeStaffNumber(
  value: string,
) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\\/g, "/")
    .replace(/-/g, "/")
    .replace(/\s+/g, "");
}

function isValidStaffNumber(
  value: string,
) {
  return /^IMTR\/STF\/\d{4}\/\d{3,6}$/.test(
    value,
  );
}

function normalizeNationalId(
  value: string,
) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

function isValidNationalId(
  value: string,
) {
  return /^[A-Z0-9]{6,20}$/.test(
    value,
  );
}

function parseDateOfBirth(
  value: string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return null;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !==
      value
  ) {
    return null;
  }

  return date;
}

function formatDateOnly(
  value: Date,
) {
  return value
    .toISOString()
    .slice(0, 10);
}

function safeEqualText(
  first: string,
  second: string,
) {
  const firstBuffer =
    Buffer.from(first);

  const secondBuffer =
    Buffer.from(second);

  return (
    firstBuffer.length ===
      secondBuffer.length &&
    timingSafeEqual(
      firstBuffer,
      secondBuffer,
    )
  );
}
