"use server";

import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

import {
  AccountStatus,
  IdentityVerificationMethod,
  IdentityVerificationStatus,
  Prisma,
  RecoveryMessageSender,
  RecoveryTicketStatus,
  RecoveryTicketType,
  RecoveryTokenPurpose,
} from "@prisma/client";
import { hash as hashPassword } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import {
  hashAccountRecoveryToken,
  setAccountRecoveryActionSession,
} from "@/lib/account-recovery-action-session";
import { prisma } from "@/lib/prisma";

export type StudentActivationResult = {
  success?: boolean;
  error?: string;
  redirectTo?: string;
};

const MAX_FAILED_ATTEMPTS = 8;
const RATE_LIMIT_MINUTES = 15;
const ACTION_DURATION_MINUTES = 15;

export async function verifyStudentIdentityAndBeginActivation(
  formData: FormData,
): Promise<StudentActivationResult> {
  const admissionNumber = normalizeAdmissionNumber(
    String(formData.get("admissionNumber") ?? ""),
  );

  const identityNumber = normalizeIdentityNumber(
    String(formData.get("identityNumber") ?? ""),
  );

  const dateOfBirthInput = String(
    formData.get("dateOfBirth") ?? "",
  ).trim();

  if (!isValidAdmissionNumber(admissionNumber)) {
    return {
      error:
        "Enter a valid admission number, for example IMTR/MMTC21/001/2026.",
    };
  }

  if (!isValidIdentityNumber(identityNumber)) {
    return {
      error:
        "Enter the National ID, passport, or birth-certificate number used during student registration.",
    };
  }

  if (!parseDateOfBirth(dateOfBirthInput)) {
    return {
      error: "Enter a valid date of birth.",
    };
  }

  const requestContext = await getRequestContext();

  try {
    const recentFailures =
      await prisma.securityAuditLog.count({
        where: {
          action:
            "STUDENT_SELF_SERVICE_ACTIVATION_FAILED",
          ipHash: requestContext.ipHash,
          createdAt: {
            gte: new Date(
              Date.now() -
                RATE_LIMIT_MINUTES * 60 * 1000,
            ),
          },
        },
      });

    if (recentFailures >= MAX_FAILED_ATTEMPTS) {
      return {
        error:
          "Too many unsuccessful attempts. Wait before trying again or contact IMTR support.",
      };
    }

    /*
     * This project currently stores the registration record in Student.
     * StudentProfile is the portal-linked academic profile and may still
     * be empty for older or newly registered students.
     */
    const student = await prisma.student.findUnique({
      where: {
        admissionNumber,
      },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        nationalId: true,
        dateOfBirth: true,
        email: true,
        phone: true,
        courseCode: true,
        status: true,
      },
    });

    if (!student) {
      await recordFailedStudentActivation({
        userId: null,
        ticketId: null,
        requestContext,
        reason: "ADMISSION_NUMBER_NOT_FOUND",
      });

      return {
        error:
          "No Student Registry record was found for that admission number.",
      };
    }

    const identityMatches = safeEqualText(
      normalizeIdentityNumber(student.nationalId),
      identityNumber,
    );

    const dateOfBirthMatches =
      formatDateOnly(student.dateOfBirth) ===
      dateOfBirthInput;

    if (!identityMatches || !dateOfBirthMatches) {
      const existingUser =
        await prisma.user.findUnique({
          where: {
            email: student.email.toLowerCase(),
          },
          select: {
            id: true,
          },
        });

      const existingTicket = existingUser
        ? await findLatestActivationTicket(
            existingUser.id,
          )
        : null;

      await recordFailedStudentActivation({
        userId: existingUser?.id ?? null,
        ticketId:
          existingTicket?.id ?? null,
        requestContext,
        reason:
          "STUDENT_IDENTITY_RECORD_MISMATCH",
      });

      return {
        error:
          "The identity number or date of birth does not match the Student Registry record.",
      };
    }

    if (student.status !== "ACTIVE") {
      return {
        error:
          "This student record is not active. Contact the Student Registry.",
      };
    }

    const intakeCode =
      extractIntakeCode(
        student.admissionNumber,
      );

    const intake = await prisma.intake.findUnique({
      where: {
        code: intakeCode,
      },
      select: {
        id: true,
        code: true,
        title: true,
        course: {
          select: {
            code: true,
            title: true,
          },
        },
      },
    });

    if (!intake) {
      return {
        error: `No intake was found for ${intakeCode}. The Student Registry must link this admission to a valid intake before activation.`,
      };
    }

    const studentRole =
      await prisma.role.findUnique({
        where: {
          name: "student",
        },
        select: {
          id: true,
        },
      });

    if (!studentRole) {
      return {
        error:
          "The Student portal role is missing. Contact the system administrator.",
      };
    }

    const normalizedEmail =
      student.email.trim().toLowerCase();

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
        select: {
          id: true,
          email: true,
          isActive: true,
          accountStatus: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

    if (
      existingUser &&
      existingUser.role.name !== "student"
    ) {
      return {
        error:
          "The registered email belongs to a non-student portal account. Contact the system administrator.",
      };
    }

    if (
      existingUser?.isActive &&
      existingUser.accountStatus ===
        AccountStatus.ACTIVE
    ) {
      return {
        error:
          "This student account is already active. Sign in normally or use account recovery if the password was forgotten.",
      };
    }

    if (
      existingUser &&
      existingUser.accountStatus !==
        AccountStatus.PENDING_ACTIVATION
    ) {
      return {
        error:
          "This student account cannot be activated automatically in its current state. Contact IMTR support.",
      };
    }

    const identityHash =
      hashStudentIdentityNumber(
        identityNumber,
      );

    const identityOwner =
      await prisma.userIdentityProfile.findUnique({
        where: {
          nationalIdHash: identityHash,
        },
        select: {
          userId: true,
        },
      });

    if (
      identityOwner &&
      identityOwner.userId !== existingUser?.id
    ) {
      return {
        error:
          "The registered identity number is already linked to another portal account. Contact IMTR support.",
      };
    }

    /*
     * All expensive hashes are prepared before the Prisma transaction.
     */
    const inaccessiblePassword =
      randomBytes(48).toString("hex");

    const passwordHash = await hashPassword(
      inaccessiblePassword,
      12,
    );

    const hiddenAccessCode =
      randomBytes(24).toString("base64url");

    const accessCodeHash =
      await hashPassword(
        hiddenAccessCode,
        12,
      );

    const ticketNumber =
      await generateUniqueActivationTicketNumber();

    const rawToken =
      randomBytes(32).toString("base64url");

    const tokenHash =
      hashAccountRecoveryToken(rawToken);

    const expiresAt = new Date(
      Date.now() +
        ACTION_DURATION_MINUTES * 60 * 1000,
    );

    const result = await prisma.$transaction(
      async (transaction) => {
        const now = new Date();

        const account = existingUser
          ? await transaction.user.update({
              where: {
                id: existingUser.id,
              },
              data: {
                firstName:
                  student.firstName,
                lastName:
                  student.lastName,
                roleId:
                  studentRole.id,
                isActive: false,
                accountStatus:
                  AccountStatus.PENDING_ACTIVATION,
                requiresPasswordChange:
                  true,
              },
              select: {
                id: true,
                email: true,
              },
            })
          : await transaction.user.create({
              data: {
                email: normalizedEmail,
                firstName:
                  student.firstName,
                lastName:
                  student.lastName,
                password: passwordHash,
                roleId:
                  studentRole.id,
                isActive: false,
                accountStatus:
                  AccountStatus.PENDING_ACTIVATION,
                requiresPasswordChange:
                  true,
              },
              select: {
                id: true,
                email: true,
              },
            });

        await transaction.userIdentityProfile.upsert({
          where: {
            userId: account.id,
          },
          create: {
            userId: account.id,
            nationalIdHash:
              identityHash,
            nationalIdLast4:
              identityNumber.slice(-4),
            dateOfBirth:
              student.dateOfBirth,
            phone: student.phone,
            emailVerified: false,
            phoneVerified: false,
          },
          update: {
            nationalIdHash:
              identityHash,
            nationalIdLast4:
              identityNumber.slice(-4),
            dateOfBirth:
              student.dateOfBirth,
            phone: student.phone,
          },
        });

        await transaction.studentProfile.upsert({
          where: {
            userId: account.id,
          },
          create: {
            admissionNumber:
              student.admissionNumber,
            userId: account.id,
            intakeId: intake.id,
            academicStatus:
              student.status,
          },
          update: {
            admissionNumber:
              student.admissionNumber,
            intakeId: intake.id,
            academicStatus:
              student.status,
          },
        });

        let activationTicket =
          await transaction.accountRecoveryTicket.findFirst(
            {
              where: {
                userId: account.id,
                type:
                  RecoveryTicketType.NEW_ACCOUNT_ACTIVATION,
                status: {
                  notIn: [
                    RecoveryTicketStatus.REJECTED,
                    RecoveryTicketStatus.CLOSED,
                  ],
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              select: {
                id: true,
              },
            },
          );

        if (!activationTicket) {
          activationTicket =
            await transaction.accountRecoveryTicket.create(
              {
                data: {
                  ticketNumber,
                  accessCodeHash,
                  type:
                    RecoveryTicketType.NEW_ACCOUNT_ACTIVATION,
                  status:
                    RecoveryTicketStatus.SUBMITTED,
                  userId: account.id,
                  claimantName: `${student.firstName} ${student.lastName}`,
                  claimantEmail:
                    normalizedEmail,
                  claimantPhone:
                    student.phone,
                  claimantReference:
                    student.admissionNumber,
                  subject:
                    "New student portal account activation",
                  description:
                    `Automatic activation for ${student.admissionNumber}, intake ${intake.code}, ${intake.course.code} - ${intake.course.title}.`,
                },
                select: {
                  id: true,
                },
              },
            );
        }

        await transaction.accountRecoveryToken.updateMany(
          {
            where: {
              userId: account.id,
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
                userId: account.id,
                ticketId:
                  activationTicket.id,
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
            id: activationTicket.id,
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
              ticketId:
                activationTicket.id,
              method:
                IdentityVerificationMethod.IDENTITY_RECORD_MATCH,
              status:
                IdentityVerificationStatus.PASSED,
              identifierHash:
                identityHash,
              dateOfBirthMatched:
                true,
            },
          },
        );

        await transaction.recoveryTicketMessage.create({
          data: {
            ticketId:
              activationTicket.id,
            senderType:
              RecoveryMessageSender.SYSTEM,
            body:
              "Your admission number, identity number and date of birth matched the Student Registry. You may now create your private portal password.",
            isInternal: false,
          },
        });

        await transaction.securityAuditLog.create({
          data: {
            action:
              "STUDENT_SELF_SERVICE_ACTIVATION_VERIFIED",
            outcome: "SUCCESS",
            targetUserId:
              account.id,
            ticketId:
              activationTicket.id,
            ipHash:
              requestContext.ipHash,
            userAgent:
              requestContext.userAgent,
            metadata: {
              admissionNumber:
                student.admissionNumber,
              intakeCode:
                intake.code,
              courseCode:
                student.courseCode,
              studentProfileCreated:
                true,
              nextStatus:
                RecoveryTicketStatus.RESET_AUTHORIZED,
              expiresAt:
                expiresAt.toISOString(),
              source:
                "STUDENT_SELF_SERVICE_ACCOUNT_ACTIVATION",
            },
          },
        });

        return {
          userId: account.id,
          ticketId:
            activationTicket.id,
          tokenId:
            createdToken.id,
        };
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    await setAccountRecoveryActionSession({
      tokenId: result.tokenId,
      rawToken,
      ticketId: result.ticketId,
      userId: result.userId,
    });

    revalidatePath(
      "/account-help/ticket",
    );
    revalidatePath(
      "/ict-admin/tickets",
    );
    revalidatePath(
      `/ict-admin/tickets/${result.ticketId}`,
    );
    revalidatePath(
      "/academic-director/students",
    );
    revalidatePath(
      "/super-admin/users",
    );

    return {
      success: true,
      redirectTo:
        "/account-help/set-password",
    };
  } catch (error) {
    console.error(
      "[verifyStudentIdentityAndBeginActivation]",
      error,
    );

    if (
      error instanceof
      Prisma.PrismaClientKnownRequestError
    ) {
      return {
        error:
          process.env.NODE_ENV ===
          "development"
            ? `Student activation failed (${error.code}): ${error.message}`
            : "The student account could not be activated. Contact IMTR support.",
      };
    }

    if (error instanceof Error) {
      return {
        error:
          process.env.NODE_ENV ===
          "development"
            ? `Student activation failed: ${error.message}`
            : "The student account could not be activated. Please try again.",
      };
    }

    return {
      error:
        "The student account could not be activated. Please try again.",
    };
  }
}


async function findLatestActivationTicket(
  userId: string,
) {
  return prisma.accountRecoveryTicket.findFirst({
    where: {
      userId,
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
  });
}

async function generateUniqueActivationTicketNumber() {
  const year =
    new Date().getFullYear();

  for (
    let attempt = 0;
    attempt < 10;
    attempt += 1
  ) {
    const sequence = String(
      randomInt(100000, 1000000),
    );

    const ticketNumber =
      `IMTR-ACT-${year}-${sequence}`;

    const existing =
      await prisma.accountRecoveryTicket.findUnique(
        {
          where: {
            ticketNumber,
          },
          select: {
            id: true,
          },
        },
      );

    if (!existing) {
      return ticketNumber;
    }
  }

  throw new Error(
    "Unable to generate a unique activation reference.",
  );
}

async function recordFailedStudentActivation({
  userId,
  ticketId,
  requestContext,
  reason,
}: {
  userId: string | null;
  ticketId: string | null;
  requestContext: {
    ipHash: string;
    userAgent: string | null;
  };
  reason: string;
}) {
  await prisma.securityAuditLog.create({
    data: {
      action:
        "STUDENT_SELF_SERVICE_ACTIVATION_FAILED",
      outcome: "DENIED",
      targetUserId: userId,
      ticketId,
      ipHash:
        requestContext.ipHash,
      userAgent:
        requestContext.userAgent,
      metadata: {
        reason,
        source:
          "STUDENT_SELF_SERVICE_ACCOUNT_ACTIVATION",
      },
    },
  });
}

async function getRequestContext() {
  const requestHeaders =
    await headers();

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
    ipHash:
      hashSensitiveValue(rawIp),
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

function hashStudentIdentityNumber(
  identityNumber: string,
) {
  return createHmac(
    "sha256",
    getIdentitySecret(),
  )
    .update(
      `IMTR_STUDENT_IDENTITY:${identityNumber}`,
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

function normalizeAdmissionNumber(
  value: string,
) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\\/g, "/")
    .replace(/\s+/g, "");
}

function isValidAdmissionNumber(
  value: string,
) {
  return /^IMTR\/[A-Z0-9-]+\/\d{3,6}\/\d{4}$/.test(
    value,
  );
}

function extractIntakeCode(
  admissionNumber: string,
) {
  const [, intakeCode] =
    admissionNumber.split("/");

  return intakeCode;
}

function normalizeIdentityNumber(
  value: string,
) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

function isValidIdentityNumber(
  value: string,
) {
  return /^[A-Z0-9]{6,30}$/.test(
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
