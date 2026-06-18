"use server";

import { revalidatePath } from "next/cache";
import { UnitAssignmentStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AssignmentActionResult = {
  success?: boolean;
  message?: string;
  error?: string;
};

async function getAuthorizedCoordinator(courseId: string) {
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
      isActive: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return {
      user: null,
      error: "Your account was not found or is inactive.",
    };
  }

  if (user.role.name !== "coordinator") {
    return {
      user: null,
      error: "Only course coordinators can manage draft unit assignments.",
    };
  }

  const coordinatorAssignment =
    await prisma.courseCoordinatorAssignment.findFirst({
      where: {
        courseId,
        userId: user.id,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

  if (!coordinatorAssignment) {
    return {
      user: null,
      error: "You are not an active coordinator for this course.",
    };
  }

  return {
    user,
    error: null,
  };
}

export async function assignUnitToSemester(
  formData: FormData,
): Promise<AssignmentActionResult> {
  const courseId = String(formData.get("courseId") || "").trim();
  const semesterId = String(formData.get("semesterId") || "").trim();
  const unitId = String(formData.get("unitId") || "").trim();

  if (!courseId || !semesterId || !unitId) {
    return {
      error: "Please select a semester and course unit.",
    };
  }

  const authorization = await getAuthorizedCoordinator(courseId);

  if (!authorization.user) {
    return {
      error: authorization.error || "You are not authorized.",
    };
  }

  try {
    const [semester, unit] = await Promise.all([
      prisma.courseSemester.findFirst({
        where: {
          id: semesterId,
          isActive: true,
          courseYear: {
            courseId,
            isActive: true,
          },
        },
        select: {
          id: true,
          title: true,
          courseYear: {
            select: {
              title: true,
            },
          },
        },
      }),

      prisma.courseUnit.findFirst({
        where: {
          id: unitId,
          courseId,
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          title: true,
        },
      }),
    ]);

    if (!semester) {
      return {
        error:
          "The selected semester does not belong to this course or is inactive.",
      };
    }

    if (!unit) {
      return {
        error: "The selected unit was not found or is inactive.",
      };
    }

    /*
     * Lock the whole semester when any assignment is awaiting review.
     * No additional units may be added until the Academic Director
     * approves or rejects the submitted assignments.
     */
    const pendingReview = await prisma.semesterUnitAssignment.findFirst({
      where: {
        semesterId,
        status: UnitAssignmentStatus.SUBMITTED,
      },
      select: {
        id: true,
      },
    });

    if (pendingReview) {
      return {
        error: `${semester.courseYear.title} — ${semester.title} is locked while assignments are awaiting approval.`,
      };
    }

    /*
     * A unit may only appear once in the entire course structure.
     * This checks every year and semester belonging to the course.
     */
    const existingAssignment = await prisma.semesterUnitAssignment.findFirst({
      where: {
        unitId,
        semester: {
          courseYear: {
            courseId,
          },
        },
      },
      select: {
        id: true,
        status: true,
        semesterId: true,
        semester: {
          select: {
            title: true,
            courseYear: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    if (existingAssignment && existingAssignment.semesterId !== semesterId) {
      return {
        error: `${unit.code} is already assigned to ${existingAssignment.semester.courseYear.title} — ${existingAssignment.semester.title}. Remove it there before assigning it to another semester.`,
      };
    }

    if (existingAssignment) {
      if (existingAssignment.status === UnitAssignmentStatus.DRAFT) {
        return {
          error: `${unit.code} is already assigned to ${semester.title} as a draft.`,
        };
      }

      if (existingAssignment.status === UnitAssignmentStatus.SUBMITTED) {
        return {
          error: `${unit.code} has already been submitted for approval.`,
        };
      }

      if (existingAssignment.status === UnitAssignmentStatus.APPROVED) {
        return {
          error: `${unit.code} is already approved for ${semester.title}.`,
        };
      }

      /*
       * Reuse a rejected or amendment-requested record by returning
       * it to draft status rather than creating a duplicate.
       */
      await prisma.semesterUnitAssignment.update({
        where: {
          id: existingAssignment.id,
        },
        data: {
          status: UnitAssignmentStatus.DRAFT,
          createdById: authorization.user.id,
          submittedById: null,
          reviewedById: null,
          submittedAt: null,
          reviewedAt: null,
          reviewNote: null,
          rejectionReason: null,
        },
      });
    } else {
      await prisma.semesterUnitAssignment.create({
        data: {
          semesterId,
          unitId,
          createdById: authorization.user.id,
          status: UnitAssignmentStatus.DRAFT,
        },
      });
    }

    revalidatePath(`/coordinator/courses/${courseId}/unit-assignments`);

    revalidatePath(`/academic-director/courses/${courseId}/structure`);

    return {
      success: true,
      message: `${unit.code} added to ${semester.courseYear.title} — ${semester.title} as a draft.`,
    };
  } catch (error) {
    console.error("[assignUnitToSemester]", error);

    return {
      error: "Failed to assign the unit to the semester.",
    };
  }
}

export async function removeDraftUnitAssignment(
  assignmentId: string,
): Promise<AssignmentActionResult> {
  if (!assignmentId) {
    return {
      error: 'Missing semester-unit assignment ID.',
    };
  }

  try {
    const assignment =
      await prisma.semesterUnitAssignment.findUnique({
        where: {
          id: assignmentId,
        },
        select: {
          id: true,
          status: true,
          unit: {
            select: {
              code: true,
              title: true,
              courseId: true,
            },
          },
          semester: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

    if (!assignment) {
      return {
        error: 'The unit assignment was not found.',
      };
    }

    const authorization = await getAuthorizedCoordinator(
      assignment.unit.courseId,
    );

    if (!authorization.user) {
      return {
        error: authorization.error || 'You are not authorized.',
      };
    }

    /*
     * Lock all changes within the semester whenever at least one
     * assignment is currently awaiting Academic Director approval.
     */
    const pendingReview =
      await prisma.semesterUnitAssignment.findFirst({
        where: {
          semesterId: assignment.semester.id,
          status: UnitAssignmentStatus.SUBMITTED,
        },
        select: {
          id: true,
        },
      });

    if (pendingReview) {
      return {
        error: `${assignment.semester.title} is locked while assignments are awaiting approval.`,
      };
    }

    if (
      assignment.status !== UnitAssignmentStatus.DRAFT &&
      assignment.status !== UnitAssignmentStatus.REJECTED &&
      assignment.status !==
        UnitAssignmentStatus.AMENDMENT_REQUESTED
    ) {
      return {
        error:
          'Only draft, rejected, or amendment-requested assignments can be removed.',
      };
    }

    await prisma.semesterUnitAssignment.delete({
      where: {
        id: assignment.id,
      },
    });

    revalidatePath(
      `/coordinator/courses/${assignment.unit.courseId}/unit-assignments`,
    );

    revalidatePath(
      `/academic-director/courses/${assignment.unit.courseId}/structure`,
    );

    return {
      success: true,
      message: `${assignment.unit.code} removed from ${assignment.semester.title}.`,
    };
  } catch (error) {
    console.error('[removeDraftUnitAssignment]', error);

    return {
      error: 'Failed to remove the draft assignment.',
    };
  }
}

export async function submitSemesterUnitAssignments(
  formData: FormData,
): Promise<AssignmentActionResult> {
  const courseId = String(formData.get("courseId") || "").trim();
  const semesterId = String(formData.get("semesterId") || "").trim();

  if (!courseId || !semesterId) {
    return {
      error: "Missing course or semester information.",
    };
  }

  const authorization = await getAuthorizedCoordinator(courseId);

  if (!authorization.user) {
    return {
      error: authorization.error || "You are not authorized.",
    };
  }

  try {
    const semester = await prisma.courseSemester.findFirst({
      where: {
        id: semesterId,
        isActive: true,
        courseYear: {
          courseId,
          isActive: true,
        },
      },
      select: {
        id: true,
        title: true,
        courseYear: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!semester) {
      return {
        error: "The selected semester was not found or is inactive.",
      };
    }

    const existingSubmission = await prisma.semesterUnitAssignment.findFirst({
      where: {
        semesterId,
        status: UnitAssignmentStatus.SUBMITTED,
      },
      select: {
        id: true,
      },
    });

    if (existingSubmission) {
      return {
        error: `${semester.courseYear.title} — ${semester.title} already has assignments awaiting approval.`,
      };
    }

    const submittedAt = new Date();

    const result = await prisma.semesterUnitAssignment.updateMany({
      where: {
        semesterId,
        status: UnitAssignmentStatus.DRAFT,
      },
      data: {
        status: UnitAssignmentStatus.SUBMITTED,
        submittedById: authorization.user.id,
        submittedAt,
        reviewedById: null,
        reviewedAt: null,
        reviewNote: null,
        rejectionReason: null,
      },
    });

    if (result.count === 0) {
      return {
        error: "There are no draft assignments to submit in this semester.",
      };
    }

    revalidatePath(`/coordinator/courses/${courseId}/unit-assignments`);

    revalidatePath(`/academic-director/courses/${courseId}/structure`);

    return {
      success: true,
      message: `${result.count} unit assignment${
        result.count === 1 ? "" : "s"
      } submitted for approval from ${semester.courseYear.title} — ${semester.title}.`,
    };
  } catch (error) {
    console.error("[submitSemesterUnitAssignments]", error);

    return {
      error: "Failed to submit the semester assignments.",
    };
  }
}
