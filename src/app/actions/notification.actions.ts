"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type TargetAudience =
  | "ALL_STUDENTS"
  | "ALL_LECTURERS"
  | "ACTIVE_COORDINATORS"
  | "EVERYONE";

type NotificationPayload = {
  title: string;
  message: string;
  actionUrl: string | null;
  senderId: string;
  userId?: string;
  studentId?: string;
};

// ============================================================================
// MARK SINGLE NOTIFICATION AS READ
// ============================================================================

export async function markNotificationAsRead(notificationId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const student = await prisma.student.findUnique({
      where: {
        email: session.user.email!,
      },
      select: {
        id: true,
      },
    });

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        OR: [
          {
            userId: session.user.id,
          },
          {
            studentId: student?.id,
          },
        ],
      },
      data: {
        isRead: true,
      },
    });

    revalidatePath("/", "layout");

    return {
      success: true,
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      error: "Failed to update notification.",
    };
  }
}

// ============================================================================
// MARK ALL AS READ
// ============================================================================

export async function markAllAsRead() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const student = await prisma.student.findUnique({
      where: {
        email: session.user.email!,
      },
      select: {
        id: true,
      },
    });

    await prisma.notification.updateMany({
      where: {
        isRead: false,
        OR: [
          {
            userId: session.user.id,
          },
          {
            studentId: student?.id ?? "VOID",
          },
        ],
      },
      data: {
        isRead: true,
      },
    });

    revalidatePath("/", "layout");

    return {
      success: true,
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      error: "Failed to update notifications.",
    };
  }
}

// ============================================================================
// DISPATCH GLOBAL NOTIFICATION
// ============================================================================

export async function dispatchGlobalNotification(formData: {
  title: string;
  message: string;
  targetAudience: TargetAudience;
  actionUrl?: string;
}) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Session expired.",
      };
    }

    const senderRole = session.user.role?.toUpperCase() ?? "";

    const isDirectorOrAdmin =
      senderRole === "ACADEMIC_DIRECTOR" ||
      senderRole === "SUPER_ADMIN" ||
      senderRole === "ADMIN";

    let isCoordinator = (session.user as any).hasCoordinatorAccess === true;

    // =========================================================================
    // REAL-TIME DATABASE SECURITY CHECK FOR LECTURERS
    // =========================================================================
    if (senderRole === "LECTURER" && !isCoordinator) {
      const [intakeCoord, courseCoord] = await Promise.all([
        prisma.intakeCoordinatorAssignment.findFirst({
          where: { coordinatorId: session.user.id, isActive: true },
          select: { id: true },
        }),
        prisma.courseCoordinatorAssignment.findFirst({
          where: { userId: session.user.id, isActive: true },
          select: { id: true },
        }),
      ]);

      if (intakeCoord || courseCoord) {
        isCoordinator = true;
      }
    }

    if (!isDirectorOrAdmin && !isCoordinator) {
      return {
        success: false,
        error:
          "Access denied. You do not have permission to broadcast notifications.",
      };
    }

    if (
      !isDirectorOrAdmin &&
      (formData.targetAudience === "EVERYONE" ||
        formData.targetAudience === "ACTIVE_COORDINATORS")
    ) {
      return {
        success: false,
        error: "Coordinators cannot perform institute-wide broadcasts.",
      };
    }

    const payloads: NotificationPayload[] = [];

    // =========================================================================
    // STUDENTS
    // =========================================================================

    if (
      formData.targetAudience === "ALL_STUDENTS" ||
      formData.targetAudience === "EVERYONE"
    ) {
      const students = await prisma.student.findMany({
        select: {
          id: true,
        },
      });

      students.forEach((student) => {
        payloads.push({
          title: formData.title,
          message: formData.message,
          actionUrl: formData.actionUrl ?? null,
          senderId: session.user.id,
          studentId: student.id,
        });
      });
    }

    // =========================================================================
    // LECTURERS (Fixed Relational Query)
    // =========================================================================

    if (
      formData.targetAudience === "ALL_LECTURERS" ||
      formData.targetAudience === "EVERYONE"
    ) {
      const lecturers = await prisma.user.findMany({
        where: {
          role: {
            name: {
              equals: "lecturer",
              mode: "insensitive",
            },
          },
        },
        select: {
          id: true,
        },
      });

      lecturers.forEach((lecturer) => {
        payloads.push({
          title: formData.title,
          message: formData.message,
          actionUrl: formData.actionUrl ?? null,
          senderId: session.user.id,
          userId: lecturer.id,
        });
      });
    }

    // =========================================================================
    // ACTIVE COORDINATORS
    // =========================================================================

    if (
      formData.targetAudience === "ACTIVE_COORDINATORS" ||
      formData.targetAudience === "EVERYONE"
    ) {
      const assignments = await prisma.intakeCoordinatorAssignment.findMany({
        where: {
          isActive: true,
        },
        select: {
          coordinatorId: true,
        },
      });

      const coordinatorIds = [
        ...new Set(assignments.map((assignment) => assignment.coordinatorId)),
      ];

      coordinatorIds.forEach((id) => {
        payloads.push({
          title: formData.title,
          message: formData.message,
          actionUrl: formData.actionUrl ?? null,
          senderId: session.user.id,
          userId: id,
        });
      });
    }

    if (payloads.length === 0) {
      return {
        success: false,
        error: "No recipients found for the selected audience.",
      };
    }

    // =========================================================================
    // REMOVE DUPLICATES
    // =========================================================================

    const seen = new Set<string>();

    const uniquePayloads = payloads.filter((payload) => {
      const key = payload.userId
        ? `user-${payload.userId}`
        : `student-${payload.studentId}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    });

    // =========================================================================
    // TRANSACTION
    // =========================================================================

    await prisma.$transaction(async (tx) => {
      await tx.notification.createMany({
        data: uniquePayloads,
      });
    });

    revalidatePath("/", "layout");

    return {
      success: true,
      count: uniquePayloads.length,
      message: `Notification delivered to ${uniquePayloads.length} recipients.`,
    };
  } catch (error) {
    console.error("Notification dispatch failed:", error);

    return {
      success: false,
      error: "An unexpected error occurred while sending notifications.",
    };
  }
}
