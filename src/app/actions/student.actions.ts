"use server";

import { createHmac, randomBytes, randomInt } from "node:crypto";

import {
  AccountStatus,
  Prisma,
  RecoveryMessageSender,
  RecoveryTicketStatus,
  RecoveryTicketType,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAdmissionNumber } from "@/lib/utils/admission-engine";

type StudentActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
  admissionNumber?: string;
  studentId?: string;
  ticketNumber?: string;
  activationPath?: string;
};

export async function registerNewStudent(
  formData: FormData,
): Promise<StudentActionResult> {
  const firstName = normalizeName(formData.get("firstName"));

  const lastName = normalizeName(formData.get("lastName"));

  const nationalId = normalizeIdentityNumber(formData.get("nationalId"));

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const phone = normalizePhone(formData.get("phone"));

  const gender = String(formData.get("gender") ?? "").trim();

  const dateOfBirthInput = String(formData.get("dateOfBirth") ?? "").trim();

  /*
   * The current form historically sends the selected intake code as
   * "courseCode". It may also send "intakeId" in newer versions.
   */
  const intakeReference = String(
    formData.get("intakeId") ?? formData.get("courseCode") ?? "",
  ).trim();

  if (
    !firstName ||
    !lastName ||
    !nationalId ||
    !email ||
    !phone ||
    !gender ||
    !dateOfBirthInput ||
    !intakeReference
  ) {
    return {
      error: "Please complete all required student and intake details.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      error: "Enter a valid student email address.",
    };
  }

  if (!isValidIdentityNumber(nationalId)) {
    return {
      error:
        "Enter a valid National ID, passport, or birth-certificate number.",
    };
  }

  if (!isValidPhone(phone)) {
    return {
      error: "Enter a valid phone number containing 9–15 digits.",
    };
  }

  const dateOfBirth = parseDate(dateOfBirthInput);

  if (!dateOfBirth) {
    return {
      error: "Enter a valid date of birth.",
    };
  }

  try {
    const [intake, studentRole] = await Promise.all([
      prisma.intake.findFirst({
        where: {
          OR: [
            {
              id: intakeReference,
            },
            {
              code: intakeReference,
            },
          ],
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
      }),

      prisma.role.findUnique({
        where: {
          name: "student",
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!intake) {
      return {
        error:
          "The selected intake was not found. Select an official intake and try again.",
      };
    }

    if (!studentRole) {
      return {
        error:
          "The Student portal role is missing. Ask the Super Administrator to create or restore it.",
      };
    }

    const identityHash = hashStudentIdentity(nationalId);

    const [duplicateStudent, duplicateUser, duplicateIdentity] =
      await Promise.all([
        prisma.student.findFirst({
          where: {
            OR: [
              {
                nationalId,
              },
              {
                email,
              },
            ],
          },
          select: {
            id: true,
            admissionNumber: true,
            nationalId: true,
            email: true,
          },
        }),

        prisma.user.findUnique({
          where: {
            email,
          },
          select: {
            id: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        }),

        prisma.userIdentityProfile.findUnique({
          where: {
            nationalIdHash: identityHash,
          },
          select: {
            id: true,
            userId: true,
          },
        }),
      ]);

    if (duplicateStudent) {
      if (duplicateStudent.nationalId === nationalId) {
        return {
          error: `A student is already registered with this identity number${
            duplicateStudent.admissionNumber
              ? ` (${duplicateStudent.admissionNumber})`
              : ""
          }.`,
        };
      }

      return {
        error: "A student is already registered with this email address.",
      };
    }

    if (duplicateUser) {
      return {
        error:
          duplicateUser.role.name === "student"
            ? "A student portal account already exists with this email address."
            : "This email belongs to a non-student portal account.",
      };
    }

    if (duplicateIdentity) {
      return {
        error:
          "This identity number is already linked to another portal account.",
      };
    }

    const admissionYear =
      extractAdmissionYear(intake.code) ?? new Date().getFullYear();

    const admissionNumber = await generateAdmissionNumber(
      intake.code,
      String(admissionYear),
    );

    const existingAdmission = await prisma.studentProfile.findUnique({
      where: {
        admissionNumber,
      },
      select: {
        id: true,
      },
    });

    if (existingAdmission) {
      return {
        error:
          "The generated admission number already exists. Try registering the student again.",
      };
    }

    const inaccessiblePassword = randomBytes(48).toString("hex");

    const passwordHash = await hash(inaccessiblePassword, 12);

    const privateAccessCode = String(randomInt(0, 1_000_000)).padStart(6, "0");

    const accessCodeHash = await hash(privateAccessCode, 12);

    const ticketNumber = await generateUniqueActivationTicketNumber();

    const session = await auth();

    const result = await prisma.$transaction(
      async (transaction) => {
        /*
         * Keep the existing registry record temporarily because current
         * Academic Director pages still read from Student.
         */
        const registryStudent = await transaction.student.create({
          data: {
            admissionNumber,
            firstName,
            lastName,
            nationalId,
            email,
            phone,
            gender,
            dateOfBirth,
            courseCode: intake.code,
            intakeId: intake.id,
            status: "ACTIVE",
          },
          select: {
            id: true,
            admissionNumber: true,
          },
        });

        const portalUser = await transaction.user.create({
          data: {
            email,
            firstName,
            lastName,
            password: passwordHash,
            roleId: studentRole.id,
            isActive: false,
            accountStatus: AccountStatus.PENDING_ACTIVATION,
            requiresPasswordChange: true,
          },
          select: {
            id: true,
          },
        });

        await transaction.userIdentityProfile.create({
          data: {
            userId: portalUser.id,
            nationalIdHash: identityHash,
            nationalIdLast4: nationalId.slice(-4),
            dateOfBirth,
            phone,
            emailVerified: false,
            phoneVerified: false,
          },
        });

        await transaction.studentProfile.create({
          data: {
            admissionNumber,
            userId: portalUser.id,
            intakeId: intake.id,
            academicStatus: "ACTIVE",
          },
        });

        const activationTicket = await transaction.accountRecoveryTicket.create(
          {
            data: {
              ticketNumber,
              accessCodeHash,
              type: RecoveryTicketType.NEW_ACCOUNT_ACTIVATION,
              status: RecoveryTicketStatus.SUBMITTED,
              userId: portalUser.id,
              claimantName: `${firstName} ${lastName}`,
              claimantEmail: email,
              claimantPhone: phone,
              claimantReference: admissionNumber,
              subject: "New student portal account activation",
              description:
                `Student registration completed for ${admissionNumber}, ` +
                `${intake.code}, ${intake.course.code} - ${intake.course.title}.`,
            },
            select: {
              id: true,
              ticketNumber: true,
            },
          },
        );

        await transaction.recoveryTicketMessage.create({
          data: {
            ticketId: activationTicket.id,
            senderType: RecoveryMessageSender.SYSTEM,
            body:
              `Your student account has been registered with admission number ${admissionNumber}. ` +
              "Open Account Help, choose Student Account Activation, verify your registered details, and create your private password.",
            isInternal: false,
          },
        });

        await transaction.securityAuditLog.create({
          data: {
            action: "STUDENT_PORTAL_ACCOUNT_REGISTERED",
            outcome: "SUCCESS",
            actorUserId: session?.user?.id ?? null,
            targetUserId: portalUser.id,
            ticketId: activationTicket.id,
            metadata: {
              registryStudentId: registryStudent.id,
              admissionNumber,
              intakeId: intake.id,
              intakeCode: intake.code,
              courseCode: intake.course.code,
              portalRecordsCreated: {
                user: true,
                identityProfile: true,
                studentProfile: true,
                activationTicket: true,
              },
              source: "ACADEMIC_DIRECTOR_STUDENT_REGISTRY",
            },
          },
        });

        return {
          studentId: registryStudent.id,
          admissionNumber: registryStudent.admissionNumber,
          ticketNumber: activationTicket.ticketNumber,
        };
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    revalidateStudentPages(result.studentId, intake.id);

    return {
      success: true,
      studentId: result.studentId,
      admissionNumber: result.admissionNumber,
      ticketNumber: result.ticketNumber,
      activationPath: "/account-help/activate/student",
      message:
        "Student registered successfully. The student can now activate the account using the admission number, identity number, and date of birth.",
    };
  } catch (error) {
    console.error("[registerNewStudent]", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          error:
            "A student or portal account already exists with one of these unique details.",
        };
      }

      return {
        error:
          process.env.NODE_ENV === "development"
            ? `Student registration failed (${error.code}): ${error.message}`
            : "Student registration failed because the database rejected the record.",
      };
    }

    return {
      error:
        error instanceof Error && process.env.NODE_ENV === "development"
          ? `Student registration failed: ${error.message}`
          : "Failed to register the student. Please try again.",
    };
  }
}

export async function updateStudent(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  const firstName = normalizeName(formData.get("firstName"));

  const lastName = normalizeName(formData.get("lastName"));

  const nationalId = normalizeIdentityNumber(formData.get("nationalId"));

  const gender = String(formData.get("gender") ?? "").trim();

  const dateOfBirthInput = String(formData.get("dateOfBirth") ?? "").trim();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  const phone = normalizePhone(formData.get("phone"));

  const intakeReference = String(
    formData.get("intakeId") ?? formData.get("courseCode") ?? "",
  ).trim();

  const status = String(formData.get("status") ?? "")
    .trim()
    .toUpperCase();

  if (!id) {
    throw new Error("Missing student ID.");
  }

  if (
    !firstName ||
    !lastName ||
    !nationalId ||
    !gender ||
    !dateOfBirthInput ||
    !email ||
    !phone ||
    !intakeReference ||
    !status
  ) {
    throw new Error("Please fill in all required fields.");
  }

  const dateOfBirth = parseDate(dateOfBirthInput);

  if (!dateOfBirth) {
    throw new Error("Enter a valid date of birth.");
  }

  const [student, intake] = await Promise.all([
    prisma.student.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        admissionNumber: true,
        email: true,
        nationalId: true,
      },
    }),

    prisma.intake.findFirst({
      where: {
        OR: [
          {
            id: intakeReference,
          },
          {
            code: intakeReference,
          },
        ],
      },
      select: {
        id: true,
        code: true,
      },
    }),
  ]);

  if (!student) {
    throw new Error("The student record was not found.");
  }

  if (!intake) {
    throw new Error("The selected intake was not found.");
  }

  const linkedProfile = await prisma.studentProfile.findUnique({
    where: {
      admissionNumber: student.admissionNumber,
    },
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  const identityHash = hashStudentIdentity(nationalId);

  const [duplicateStudent, duplicateUser, duplicateIdentity] =
    await Promise.all([
      prisma.student.findFirst({
        where: {
          id: {
            not: id,
          },
          OR: [
            {
              nationalId,
            },
            {
              email,
            },
          ],
        },
        select: {
          id: true,
        },
      }),

      linkedProfile
        ? prisma.user.findFirst({
            where: {
              email,
              id: {
                not: linkedProfile.userId,
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),

      linkedProfile
        ? prisma.userIdentityProfile.findFirst({
            where: {
              nationalIdHash: identityHash,
              userId: {
                not: linkedProfile.userId,
              },
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
    ]);

  if (duplicateStudent || duplicateUser || duplicateIdentity) {
    throw new Error(
      "Another student or portal account already uses the submitted email or identity number.",
    );
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.student.update({
      where: {
        id,
      },
      data: {
        firstName,
        lastName,
        nationalId,
        gender,
        dateOfBirth,
        email,
        phone,
        courseCode: intake.code,
        intakeId: intake.id,
        status,
      },
    });

    if (linkedProfile) {
      await transaction.user.update({
        where: {
          id: linkedProfile.userId,
        },
        data: {
          firstName,
          lastName,
          email,
        },
      });

      await transaction.userIdentityProfile.upsert({
        where: {
          userId: linkedProfile.userId,
        },
        create: {
          userId: linkedProfile.userId,
          nationalIdHash: identityHash,
          nationalIdLast4: nationalId.slice(-4),
          dateOfBirth,
          phone,
        },
        update: {
          nationalIdHash: identityHash,
          nationalIdLast4: nationalId.slice(-4),
          dateOfBirth,
          phone,
        },
      });

      await transaction.studentProfile.update({
        where: {
          id: linkedProfile.id,
        },
        data: {
          intakeId: intake.id,
          academicStatus: status,
        },
      });

      await transaction.accountRecoveryTicket.updateMany({
        where: {
          userId: linkedProfile.userId,
          type: RecoveryTicketType.NEW_ACCOUNT_ACTIVATION,
          status: {
            notIn: [RecoveryTicketStatus.RESOLVED, RecoveryTicketStatus.CLOSED],
          },
        },
        data: {
          claimantName: `${firstName} ${lastName}`,
          claimantEmail: email,
          claimantPhone: phone,
          lastActivityAt: new Date(),
        },
      });
    }
  });

  revalidateStudentPages(id, intake.id);

  redirect(`/academic-director/students/${id}?updated=1`);
}

export async function suspendStudent(
  studentId: string,
): Promise<StudentActionResult> {
  if (!studentId) {
    return {
      error: "Missing student ID.",
    };
  }

  try {
    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
      },
      select: {
        admissionNumber: true,
      },
    });

    if (!student) {
      return {
        error: "The student record was not found.",
      };
    }

    const profile = await prisma.studentProfile.findUnique({
      where: {
        admissionNumber: student.admissionNumber,
      },
      select: {
        id: true,
        userId: true,
        intakeId: true,
        user: {
          select: {
            accountStatus: true,
          },
        },
      },
    });

    await prisma.$transaction(async (transaction) => {
      await transaction.student.update({
        where: {
          id: studentId,
        },
        data: {
          status: "SUSPENDED",
        },
      });

      if (profile) {
        await transaction.studentProfile.update({
          where: {
            id: profile.id,
          },
          data: {
            academicStatus: "SUSPENDED",
          },
        });

        if (profile.user.accountStatus === AccountStatus.ACTIVE) {
          await transaction.user.update({
            where: {
              id: profile.userId,
            },
            data: {
              isActive: false,
              accountStatus: AccountStatus.SUSPENDED,
            },
          });
        }
      }
    });

    revalidateStudentPages(studentId, profile?.intakeId);

    return {
      success: true,
      message: "Student suspended successfully.",
    };
  } catch (error) {
    console.error("[suspendStudent]", error);

    return {
      error: "Failed to suspend the student.",
    };
  }
}

export async function reactivateStudent(
  studentId: string,
): Promise<StudentActionResult> {
  if (!studentId) {
    return {
      error: "Missing student ID.",
    };
  }

  try {
    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
      },
      select: {
        admissionNumber: true,
      },
    });

    if (!student) {
      return {
        error: "The student record was not found.",
      };
    }

    const profile = await prisma.studentProfile.findUnique({
      where: {
        admissionNumber: student.admissionNumber,
      },
      select: {
        id: true,
        userId: true,
        intakeId: true,
        user: {
          select: {
            accountStatus: true,
          },
        },
      },
    });

    await prisma.$transaction(async (transaction) => {
      await transaction.student.update({
        where: {
          id: studentId,
        },
        data: {
          status: "ACTIVE",
        },
      });

      if (profile) {
        await transaction.studentProfile.update({
          where: {
            id: profile.id,
          },
          data: {
            academicStatus: "ACTIVE",
          },
        });

        if (profile.user.accountStatus === AccountStatus.SUSPENDED) {
          await transaction.user.update({
            where: {
              id: profile.userId,
            },
            data: {
              isActive: true,
              accountStatus: AccountStatus.ACTIVE,
            },
          });
        }
      }
    });

    revalidateStudentPages(studentId, profile?.intakeId);

    return {
      success: true,
      message: "Student reactivated successfully.",
    };
  } catch (error) {
    console.error("[reactivateStudent]", error);

    return {
      error: "Failed to reactivate the student.",
    };
  }
}

export async function createTrainingCourse(formData: FormData) {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();

  const title = String(formData.get("title") ?? "").trim();

  const category = String(formData.get("category") ?? "").trim();

  const description = String(formData.get("description") ?? "").trim();

  if (!code || !title || !category) {
    return {
      error: "Course code, title, and category are required.",
    };
  }

  try {
    const existingCourse = await prisma.trainingCourse.findUnique({
      where: {
        code,
      },
    });

    if (existingCourse) {
      return {
        error: "A course with this code already exists.",
      };
    }

    const course = await prisma.trainingCourse.create({
      data: {
        code,
        title,
        category: category as never,
        description: description || null,
      },
    });

    revalidatePath("/academic-director/courses");

    return {
      success: true,
      courseId: course.id,
      message: "Course created successfully.",
    };
  } catch (error) {
    console.error("[createTrainingCourse]", error);

    return {
      error: "Failed to create course. Please check the course details.",
    };
  }
}

export async function updateTrainingCourse(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();

  const title = String(formData.get("title") ?? "").trim();

  const category = String(formData.get("category") ?? "").trim();

  const description = String(formData.get("description") ?? "").trim();

  if (!id) {
    return {
      error: "Missing course ID.",
    };
  }

  if (!code || !title || !category) {
    return {
      error: "Course code, title, and category are required.",
    };
  }

  try {
    const existingCourse = await prisma.trainingCourse.findFirst({
      where: {
        code,
        NOT: {
          id,
        },
      },
    });

    if (existingCourse) {
      return {
        error: "Another course with this code already exists.",
      };
    }

    const course = await prisma.trainingCourse.update({
      where: {
        id,
      },
      data: {
        code,
        title,
        category: category as never,
        description: description || null,
      },
    });

    revalidatePath("/academic-director/courses");

    revalidatePath(`/academic-director/courses/${id}`);

    revalidatePath(`/academic-director/courses/${id}/edit`);

    return {
      success: true,
      courseId: course.id,
      message: "Course updated successfully.",
    };
  } catch (error) {
    console.error("[updateTrainingCourse]", error);

    return {
      error: "Failed to update course. Please check the course details.",
    };
  }
}

function getIdentitySecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET or BETTER_AUTH_SECRET is required.");
  }

  return secret;
}

function hashStudentIdentity(identityNumber: string) {
  return createHmac("sha256", getIdentitySecret())
    .update(`IMTR_STUDENT_IDENTITY:${identityNumber}`)
    .digest("hex");
}

async function generateUniqueActivationTicketNumber() {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const ticketNumber = `IMTR-ACT-${year}-${randomInt(100000, 1000000)}`;

    const existing = await prisma.accountRecoveryTicket.findUnique({
      where: {
        ticketNumber,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return ticketNumber;
    }
  }

  throw new Error("Unable to generate a unique activation ticket number.");
}

function revalidateStudentPages(studentId: string, intakeId?: string) {
  revalidatePath("/academic-director/students");

  revalidatePath(`/academic-director/students/${studentId}`);

  revalidatePath(`/academic-director/students/${studentId}/edit`);

  revalidatePath("/academic-director/intakes");

  revalidatePath("/coordinator");

  revalidatePath("/coordinator/students");

  if (intakeId) {
    revalidatePath(`/academic-director/intakes/${intakeId}`);
  }

  revalidatePath("/super-admin/users");

  revalidatePath("/ict-admin/tickets");

  revalidatePath("/student/results");
}

function normalizeName(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeIdentityNumber(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

function normalizePhone(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .replace(/[\s()-]/g, "");
}

function isValidIdentityNumber(value: string) {
  return /^[A-Z0-9]{6,30}$/.test(value);
}

function isValidPhone(value: string) {
  return /^\+?\d{9,15}$/.test(value);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return parsed;
}

function extractAdmissionYear(intakeCode: string) {
  const yearMatch = intakeCode.match(/(?:19|20)\d{2}/);

  if (!yearMatch) {
    return null;
  }

  return Number(yearMatch[0]);
}
