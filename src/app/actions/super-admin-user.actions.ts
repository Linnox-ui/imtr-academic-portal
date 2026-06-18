"use server";

import { createHmac, randomBytes, randomInt } from "node:crypto";

import { hash } from "bcryptjs";
import {
  AccountStatus,
  Prisma,
  RecoveryMessageSender,
  RecoveryTicketStatus,
  RecoveryTicketType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type UserManagementActionResult = {
  success?: boolean;
  message?: string;
  error?: string;

  /*
   * Shown once after an activation or recovery
   * ticket is created.
   */
  ticketNumber?: string;
  privateAccessCode?: string;
  staffNumber?: string;
};

type AuthorizedSuperAdmin = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

async function getAuthorizedSuperAdmin(): Promise<{
  user: AuthorizedSuperAdmin | null;
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
      email: true,
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

  if (!user || !user.isActive || user.accountStatus !== AccountStatus.ACTIVE) {
    return {
      user: null,
      error:
        "Your administrator account was not found, is inactive, or is not fully activated.",
    };
  }

  if (user.role.name !== "super_admin") {
    return {
      user: null,
      error: "Only an active Super Administrator can manage portal users.",
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    error: null,
  };
}

export async function createPortalUser(
  formData: FormData,
): Promise<UserManagementActionResult> {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const roleId = String(formData.get("roleId") ?? "").trim();

  const nationalId = normalizeNationalId(
    String(formData.get("nationalId") ?? ""),
  );

  const dateOfBirthInput = String(formData.get("dateOfBirth") ?? "").trim();

  const phone = normalizePhone(String(formData.get("phone") ?? ""));

  if (!firstName) {
    return {
      error: "Enter the user’s first name.",
    };
  }

  if (!lastName) {
    return {
      error: "Enter the user’s last name.",
    };
  }

  if (!isValidName(firstName)) {
    return {
      error: "The first name contains unsupported characters.",
    };
  }

  if (!isValidName(lastName)) {
    return {
      error: "The last name contains unsupported characters.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      error: "Enter a valid email address.",
    };
  }

  if (!roleId) {
    return {
      error: "Select a portal role.",
    };
  }

  if (!isValidNationalId(nationalId)) {
    return {
      error:
        "Enter a valid National ID or passport number using 6–20 letters or digits.",
    };
  }

  const dateOfBirth = parseDateOfBirth(dateOfBirthInput);

  if (!dateOfBirth) {
    return {
      error: "Enter a valid date of birth.",
    };
  }

  if (!isAdultDateOfBirth(dateOfBirth)) {
    return {
      error:
        "The staff member must be at least 18 years old and the date of birth must be realistic.",
    };
  }

  if (!isValidPhone(phone)) {
    return {
      error:
        "Enter a valid phone number containing 9–15 digits, for example 0712345678 or +254712345678.",
    };
  }

  const authorization = await getAuthorizedSuperAdmin();

  if (!authorization.user) {
    return {
      error: authorization.error ?? "You are not authorized.",
    };
  }

  const authorizedAdmin = authorization.user;

  try {
    const role = await prisma.role.findUnique({
      where: {
        id: roleId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!role) {
      return {
        error: "The selected portal role was not found.",
      };
    }

    if (role.name === "student") {
      return {
        error:
          "Create student accounts through the Student Registry so an admission number, intake and student profile are created correctly.",
      };
    }

    if (role.name === "coordinator") {
      return {
        error:
          "Create the staff member as a Lecturer. Course Coordinator access is assigned by the Academic Director when creating or managing an intake.",
      };
    }

    const nationalIdHash = hashNationalId(nationalId);

    const [existingUser, existingIdentity] = await Promise.all([
      prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      }),

      prisma.userIdentityProfile.findUnique({
        where: {
          nationalIdHash,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (existingUser) {
      return {
        error: "An account already exists with this email address.",
      };
    }

    if (existingIdentity) {
      return {
        error:
          "A staff identity profile already exists for this National ID or passport number.",
      };
    }

    const ticketNumber = await generateUniqueTicketNumber("ACT");
    const privateAccessCode = generatePrivateAccessCode();
    const accessCodeHash = await hash(privateAccessCode, 12);

    const inaccessiblePassword = randomBytes(48).toString("hex");
    const passwordHash = await hash(inaccessiblePassword, 12);

    const result = await prisma.$transaction(async (transaction) => {
      const staffNumber = await generateStaffNumber(transaction);

      const createdUser = await transaction.user.create({
        data: {
          email,
          firstName,
          lastName,
          password: passwordHash,
          roleId: role.id,
          isActive: false,
          accountStatus: AccountStatus.PENDING_ACTIVATION,
          requiresPasswordChange: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      await transaction.userIdentityProfile.create({
        data: {
          userId: createdUser.id,
          nationalIdHash,
          nationalIdLast4: nationalId.slice(-4),
          dateOfBirth,
          phone,
          staffNumber,
          emailVerified: false,
          phoneVerified: false,
        },
      });

      const activationTicket = await transaction.accountRecoveryTicket.create({
        data: {
          ticketNumber,
          accessCodeHash,
          type: RecoveryTicketType.NEW_ACCOUNT_ACTIVATION,
          status: RecoveryTicketStatus.SUBMITTED,
          userId: createdUser.id,
          claimantName: `${firstName} ${lastName}`,
          claimantEmail: email,
          claimantPhone: phone,
          claimantReference: staffNumber,
          subject: "New portal account activation",
          description:
            "This activation request was created automatically when the staff portal account was registered.",
        },
        select: {
          id: true,
          ticketNumber: true,
        },
      });

      await transaction.recoveryTicketMessage.create({
        data: {
          ticketId: activationTicket.id,
          senderType: RecoveryMessageSender.SYSTEM,
          body: `Your IMTR staff portal account has been created with staff number ${staffNumber}. Open the Account Help Centre, complete identity verification and create your private password.`,
          isInternal: false,
        },
      });

      await transaction.securityAuditLog.create({
        data: {
          action: "PORTAL_USER_CREATED",
          outcome: "SUCCESS",
          actorUserId: authorizedAdmin.id,
          targetUserId: createdUser.id,
          ticketId: activationTicket.id,
          metadata: {
            role: role.name,
            staffNumber,
            nationalIdLast4: nationalId.slice(-4),
            identityProfileComplete: true,
            accountStatus: AccountStatus.PENDING_ACTIVATION,
            source: "SUPER_ADMIN_USER_MANAGEMENT",
          },
        },
      });

      return {
        createdUser,
        activationTicket,
        staffNumber,
      };
    });

    revalidateUserManagementPages();

    return {
      success: true,
      ticketNumber: result.activationTicket.ticketNumber,
      privateAccessCode,
      staffNumber: result.staffNumber,
      message: `${result.createdUser.firstName} ${
        result.createdUser.lastName
      } was registered as ${formatRole(
        result.createdUser.role.name,
      )} with staff number ${
        result.staffNumber
      } and is waiting for account activation.`,
    };
  } catch (error) {
    console.error("[createPortalUser]", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error:
          "A user, National ID, phone, or staff number already exists with these details.",
      };
    }

    return {
      error: "Failed to create the staff account. Please try again.",
    };
  }
}

export async function updatePortalUserRole(
  formData: FormData,
): Promise<UserManagementActionResult> {
  const userId = String(formData.get("userId") ?? "").trim();
  const roleId = String(formData.get("roleId") ?? "").trim();

  if (!userId || !roleId) {
    return {
      error: "Missing user or role information.",
    };
  }

  const authorization = await getAuthorizedSuperAdmin();

  if (!authorization.user) {
    return {
      error: authorization.error ?? "You are not authorized.",
    };
  }

  const authorizedAdmin = authorization.user;

  if (userId === authorizedAdmin.id) {
    return {
      error: "You cannot change your own Super Administrator role.",
    };
  }

  try {
    const [targetUser, selectedRole] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isActive: true,
          accountStatus: true,
          studentProfile: {
            select: {
              id: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),

      prisma.role.findUnique({
        where: {
          id: roleId,
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    if (!targetUser) {
      return {
        error: "The selected user account was not found.",
      };
    }

    if (!selectedRole) {
      return {
        error: "The selected portal role was not found.",
      };
    }

    if (targetUser.role.name === selectedRole.name) {
      return {
        error: `${targetUser.firstName} ${
          targetUser.lastName
        } already has the ${formatRole(selectedRole.name)} role.`,
      };
    }

    if (selectedRole.name === "student" && !targetUser.studentProfile) {
      return {
        error:
          "A user cannot be changed to Student without a valid Student Profile. Create or manage the student through the Student Registry.",
      };
    }

    if (
      selectedRole.name === "coordinator" &&
      targetUser.role.name !== "coordinator"
    ) {
      return {
        error:
          "Coordinator is no longer assigned as a normal account role. Appoint a lecturer as coordinator through the intake workflow.",
      };
    }

    if (
      targetUser.studentProfile &&
      targetUser.role.name === "student" &&
      selectedRole.name !== "student"
    ) {
      return {
        error:
          "This account is linked to a Student Profile. Student role changes must be handled through the Student Registry.",
      };
    }

    if (
      targetUser.role.name === "super_admin" &&
      selectedRole.name !== "super_admin" &&
      targetUser.isActive
    ) {
      const activeSuperAdminCount = await countActiveSuperAdmins();

      if (activeSuperAdminCount <= 1) {
        return {
          error:
            "You cannot remove the role from the last active Super Administrator.",
        };
      }
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: {
          id: targetUser.id,
        },
        data: {
          roleId: selectedRole.id,
        },
      });

      await transaction.securityAuditLog.create({
        data: {
          action: "PORTAL_USER_ROLE_CHANGED",
          outcome: "SUCCESS",
          actorUserId: authorizedAdmin.id,
          targetUserId: targetUser.id,
          metadata: {
            previousRole: targetUser.role.name,
            newRole: selectedRole.name,
            accountStatus: targetUser.accountStatus,
            source: "SUPER_ADMIN_USER_MANAGEMENT",
          },
        },
      });
    });

    revalidateUserManagementPages();

    return {
      success: true,
      message: `${targetUser.firstName} ${
        targetUser.lastName
      } is now assigned the ${formatRole(selectedRole.name)} role.`,
    };
  } catch (error) {
    console.error("[updatePortalUserRole]", error);

    return {
      error: "Failed to update the user role. Please try again.",
    };
  }
}

export async function setPortalUserActiveState(
  formData: FormData,
): Promise<UserManagementActionResult> {
  const userId = String(formData.get("userId") ?? "").trim();
  const nextActiveState = String(formData.get("isActive") ?? "") === "true";

  if (!userId) {
    return {
      error: "Missing user account information.",
    };
  }

  const authorization = await getAuthorizedSuperAdmin();

  if (!authorization.user) {
    return {
      error: authorization.error ?? "You are not authorized.",
    };
  }

  const authorizedAdmin = authorization.user;

  if (userId === authorizedAdmin.id) {
    return {
      error: "You cannot deactivate your own Super Administrator account.",
    };
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
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

    if (!targetUser) {
      return {
        error: "The selected user account was not found.",
      };
    }

    if (targetUser.isActive === nextActiveState) {
      return {
        error: nextActiveState
          ? "This account is already active."
          : "This account is already inactive.",
      };
    }

    if (
      nextActiveState &&
      targetUser.accountStatus === AccountStatus.PENDING_ACTIVATION
    ) {
      return {
        error:
          "This account is waiting for activation. The user must complete identity verification and create a password through the Account Help Centre.",
      };
    }

    if (
      nextActiveState &&
      targetUser.accountStatus === AccountStatus.SUSPENDED
    ) {
      return {
        error:
          "This account is suspended. A suspension review is required before access can be restored.",
      };
    }

    if (nextActiveState && targetUser.accountStatus === AccountStatus.LOCKED) {
      return {
        error:
          "This account is locked. Use the account-recovery process instead of manually activating it.",
      };
    }

    if (!nextActiveState && targetUser.role.name === "super_admin") {
      const activeSuperAdminCount = await countActiveSuperAdmins();

      if (activeSuperAdminCount <= 1) {
        return {
          error: "You cannot deactivate the last active Super Administrator.",
        };
      }
    }

    const nextAccountStatus = nextActiveState
      ? AccountStatus.ACTIVE
      : AccountStatus.DISABLED;

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: {
          id: targetUser.id,
        },
        data: {
          isActive: nextActiveState,
          accountStatus: nextAccountStatus,
        },
      });

      await transaction.securityAuditLog.create({
        data: {
          action: nextActiveState
            ? "PORTAL_USER_ACTIVATED"
            : "PORTAL_USER_DEACTIVATED",
          outcome: "SUCCESS",
          actorUserId: authorizedAdmin.id,
          targetUserId: targetUser.id,
          metadata: {
            previousIsActive: targetUser.isActive,
            previousAccountStatus: targetUser.accountStatus,
            newIsActive: nextActiveState,
            newAccountStatus: nextAccountStatus,
            source: "SUPER_ADMIN_USER_MANAGEMENT",
          },
        },
      });
    });

    revalidateUserManagementPages();

    return {
      success: true,
      message: `${targetUser.firstName} ${targetUser.lastName} was ${
        nextActiveState ? "activated" : "deactivated"
      } successfully.`,
    };
  } catch (error) {
    console.error("[setPortalUserActiveState]", error);

    return {
      error: "Failed to update the account status. Please try again.",
    };
  }
}

export async function openPortalUserPasswordRecovery(
  formData: FormData,
): Promise<UserManagementActionResult> {
  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    return {
      error: "Missing user account information.",
    };
  }

  const authorization = await getAuthorizedSuperAdmin();

  if (!authorization.user) {
    return {
      error: authorization.error ?? "You are not authorized.",
    };
  }

  const authorizedAdmin = authorization.user;

  if (userId === authorizedAdmin.id) {
    return {
      error: "Use your account security page to change your own password.",
    };
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        accountStatus: true,
        role: {
          select: {
            name: true,
          },
        },
        identityProfile: {
          select: {
            nationalIdLast4: true,
            dateOfBirth: true,
            phone: true,
            staffNumber: true,
          },
        },
      },
    });

    if (!targetUser) {
      return {
        error: "The selected user account was not found.",
      };
    }

    if (
      targetUser.role.name !== "student" &&
      (!targetUser.identityProfile?.nationalIdLast4 ||
        !targetUser.identityProfile.dateOfBirth ||
        !targetUser.identityProfile.phone ||
        !targetUser.identityProfile.staffNumber)
    ) {
      return {
        error:
          "Complete this staff member’s identity profile before opening password recovery.",
      };
    }

    if (targetUser.accountStatus === AccountStatus.PENDING_ACTIVATION) {
      return {
        error:
          "This user has not activated the new account. Use the existing activation request instead.",
      };
    }

    if (targetUser.accountStatus === AccountStatus.DISABLED) {
      return {
        error:
          "This account is disabled. Restore the account before opening password recovery.",
      };
    }

    if (targetUser.accountStatus === AccountStatus.SUSPENDED) {
      return {
        error:
          "This account is suspended. Resolve the suspension before opening password recovery.",
      };
    }

    const existingTicket = await prisma.accountRecoveryTicket.findFirst({
      where: {
        userId: targetUser.id,
        type: RecoveryTicketType.PASSWORD_RECOVERY,
        status: {
          in: [
            RecoveryTicketStatus.SUBMITTED,
            RecoveryTicketStatus.IDENTITY_REVIEW,
            RecoveryTicketStatus.MORE_INFORMATION_REQUIRED,
            RecoveryTicketStatus.VERIFIED,
            RecoveryTicketStatus.RESET_AUTHORIZED,
          ],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        ticketNumber: true,
      },
    });

    if (existingTicket) {
      return {
        error: `An active password-recovery ticket already exists: ${existingTicket.ticketNumber}.`,
      };
    }

    const ticketNumber = await generateUniqueTicketNumber("REC");
    const privateAccessCode = generatePrivateAccessCode();
    const accessCodeHash = await hash(privateAccessCode, 12);

    const ticket = await prisma.$transaction(async (transaction) => {
      const createdTicket = await transaction.accountRecoveryTicket.create({
        data: {
          ticketNumber,
          accessCodeHash,
          type: RecoveryTicketType.PASSWORD_RECOVERY,
          status: RecoveryTicketStatus.SUBMITTED,
          userId: targetUser.id,
          claimantName: `${targetUser.firstName} ${targetUser.lastName}`,
          claimantEmail: targetUser.email,
          claimantPhone: targetUser.identityProfile?.phone ?? null,
          claimantReference:
            targetUser.identityProfile?.staffNumber ?? ticketNumber,
          subject: "Portal password recovery",
          description:
            "Password recovery was initiated by a Super Administrator. ICT must verify the account holder before authorizing a password change.",
        },
        select: {
          id: true,
          ticketNumber: true,
        },
      });

      await transaction.recoveryTicketMessage.create({
        data: {
          ticketId: createdTicket.id,
          senderType: RecoveryMessageSender.SYSTEM,
          body: "Your password-recovery request has been opened. ICT will verify your identity before a secure password-change action becomes available.",
          isInternal: false,
        },
      });

      await transaction.securityAuditLog.create({
        data: {
          action: "PASSWORD_RECOVERY_TICKET_CREATED",
          outcome: "SUCCESS",
          actorUserId: authorizedAdmin.id,
          targetUserId: targetUser.id,
          ticketId: createdTicket.id,
          metadata: {
            accountStatus: targetUser.accountStatus,
            source: "SUPER_ADMIN_USER_MANAGEMENT",
          },
        },
      });

      return createdTicket;
    });

    revalidateUserManagementPages();
    revalidatePath("/ict-admin/tickets");
    revalidatePath("/account-help");

    return {
      success: true,
      ticketNumber: ticket.ticketNumber,
      privateAccessCode,
      message: `A password-recovery ticket was opened for ${targetUser.firstName} ${targetUser.lastName}.`,
    };
  } catch (error) {
    console.error("[openPortalUserPasswordRecovery]", error);

    return {
      error: "Failed to open the password-recovery ticket. Please try again.",
    };
  }
}

async function countActiveSuperAdmins() {
  return prisma.user.count({
    where: {
      isActive: true,
      accountStatus: AccountStatus.ACTIVE,
      role: {
        name: "super_admin",
      },
    },
  });
}

function revalidateUserManagementPages() {
  revalidatePath("/super-admin");
  revalidatePath("/super-admin/users");
}

async function generateUniqueTicketNumber(prefix: "ACT" | "REC") {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const sequence = randomInt(100000, 1000000);
    const ticketNumber = `IMTR-${prefix}-${year}-${sequence}`;

    const existingTicket = await prisma.accountRecoveryTicket.findUnique({
      where: {
        ticketNumber,
      },
      select: {
        id: true,
      },
    });

    if (!existingTicket) {
      return ticketNumber;
    }
  }

  throw new Error("Unable to generate a unique ticket number.");
}

async function generateStaffNumber(transaction: Prisma.TransactionClient) {
  const year = new Date().getFullYear();

  const sequence = await transaction.staffNumberSequence.upsert({
    where: {
      year,
    },
    create: {
      year,
      lastNumber: 1,
    },
    update: {
      lastNumber: {
        increment: 1,
      },
    },
    select: {
      lastNumber: true,
    },
  });

  return `IMTR/STF/${year}/${String(sequence.lastNumber).padStart(3, "0")}`;
}

function getIdentityHashSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET or BETTER_AUTH_SECRET is required to protect staff identity records.",
    );
  }

  return secret;
}

function hashNationalId(nationalId: string) {
  return createHmac("sha256", getIdentityHashSecret())
    .update(`IMTR_STAFF_IDENTITY:${nationalId}`)
    .digest("hex");
}

function normalizeNationalId(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

function isValidNationalId(value: string) {
  return /^[A-Z0-9]{6,20}$/.test(value);
}

function normalizePhone(value: string) {
  return value.trim().replace(/[\s()-]/g, "");
}

function isValidPhone(value: string) {
  return /^\+?\d{9,15}$/.test(value);
}

function parseDateOfBirth(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function isAdultDateOfBirth(dateOfBirth: Date) {
  const today = new Date();

  let age = today.getUTCFullYear() - dateOfBirth.getUTCFullYear();

  const monthDifference = today.getUTCMonth() - dateOfBirth.getUTCMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getUTCDate() < dateOfBirth.getUTCDate())
  ) {
    age -= 1;
  }

  return age >= 18 && age <= 100;
}

function generatePrivateAccessCode() {
  return String(randomInt(100000, 1000000));
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidName(value: string) {
  return /^[\p{L}\p{M}' -]{1,80}$/u.test(value);
}

function formatRole(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
