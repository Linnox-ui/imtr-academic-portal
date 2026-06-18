'use server';

import { revalidatePath } from 'next/cache';
import {
  LecturerAllocationRole,
  UnitAssignmentStatus,
} from '@prisma/client';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type LecturerAllocationResult = {
  success?: boolean;
  message?: string;
  error?: string;
};

async function getAuthorizedCoordinator(courseId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      user: null,
      error: 'You must be signed in.',
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
      error: 'Your account was not found or is inactive.',
    };
  }

  if (user.role.name !== 'coordinator') {
    return {
      user: null,
      error: 'Only course coordinators can manage lecturer allocations.',
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
      error: 'You are not an active coordinator for this course.',
    };
  }

  return {
    user,
    error: null,
  };
}

export async function assignLecturerToUnit(
  formData: FormData,
): Promise<LecturerAllocationResult> {
  const courseId = String(
    formData.get('courseId') || '',
  ).trim();

  const intakeId = String(
    formData.get('intakeId') || '',
  ).trim();

  const unitAssignmentId = String(
    formData.get('unitAssignmentId') || '',
  ).trim();

  const lecturerId = String(
    formData.get('lecturerId') || '',
  ).trim();

  const allocationRoleValue = String(
    formData.get('allocationRole') || 'PRIMARY',
  ).trim();

  const changeReason = String(
    formData.get('changeReason') || '',
  ).trim();

  if (
    !courseId ||
    !intakeId ||
    !unitAssignmentId ||
    !lecturerId
  ) {
    return {
      error: 'Select an intake, approved unit, and lecturer.',
    };
  }

  const validRoles: LecturerAllocationRole[] = [
    LecturerAllocationRole.PRIMARY,
    LecturerAllocationRole.CO_LECTURER,
    LecturerAllocationRole.ASSISTANT,
  ];

  if (
    !validRoles.includes(
      allocationRoleValue as LecturerAllocationRole,
    )
  ) {
    return {
      error: 'Invalid lecturer allocation role.',
    };
  }

  const allocationRole =
    allocationRoleValue as LecturerAllocationRole;

  const authorization =
    await getAuthorizedCoordinator(courseId);

  if (!authorization.user) {
    return {
      error:
        authorization.error ||
        'You are not authorized to manage this course.',
    };
  }

  try {
    const [intake, approvedAssignment, lecturer] =
      await Promise.all([
        prisma.intake.findFirst({
          where: {
            id: intakeId,
            courseId,
          },
          select: {
            id: true,
            code: true,
            title: true,
            year: true,
          },
        }),

        prisma.semesterUnitAssignment.findFirst({
          where: {
            id: unitAssignmentId,
            status: UnitAssignmentStatus.APPROVED,

            unit: {
              is: {
                courseId,
                isActive: true,
              },
            },

            semester: {
              is: {
                isActive: true,

                courseYear: {
                  is: {
                    courseId,
                    isActive: true,
                  },
                },
              },
            },
          },
          select: {
            id: true,

            unit: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },

            semester: {
              select: {
                id: true,
                title: true,

                courseYear: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        }),

        prisma.user.findUnique({
          where: {
            id: lecturerId,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,

            role: {
              select: {
                name: true,
              },
            },
          },
        }),
      ]);

    if (!intake) {
      return {
        error: 'The selected intake does not belong to this course.',
      };
    }

    if (!approvedAssignment) {
      return {
        error:
          'The selected unit is not approved, is inactive, or does not belong to this course.',
      };
    }

    if (!lecturer || !lecturer.isActive) {
      return {
        error:
          'The selected lecturer account was not found or is inactive.',
      };
    }

    if (lecturer.role.name !== 'lecturer') {
      return {
        error:
          'Only active users with the lecturer role can be allocated.',
      };
    }

    const duplicateAllocation =
      await prisma.lecturerUnitAllocation.findFirst({
        where: {
          intakeId,
          unitAssignmentId,
          lecturerId,
          isActive: true,
        },
        select: {
          id: true,
          allocationRole: true,
        },
      });

    if (duplicateAllocation) {
      return {
        error: `${lecturer.firstName} ${lecturer.lastName} is already allocated to this intake and unit as ${formatEnum(
          String(duplicateAllocation.allocationRole),
        )}.`,
      };
    }

    const activePrimary =
      allocationRole === LecturerAllocationRole.PRIMARY
        ? await prisma.lecturerUnitAllocation.findFirst({
            where: {
              intakeId,
              unitAssignmentId,
              allocationRole:
                LecturerAllocationRole.PRIMARY,
              isActive: true,
            },
            select: {
              id: true,

              lecturer: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          })
        : null;

    if (activePrimary && !changeReason) {
      return {
        error: `A primary lecturer is already assigned. Enter a reason for switching from ${activePrimary.lecturer.firstName} ${activePrimary.lecturer.lastName}.`,
      };
    }

    const now = new Date();

    await prisma.$transaction(async (transaction) => {
      if (activePrimary) {
        await transaction.lecturerUnitAllocation.update({
          where: {
            id: activePrimary.id,
          },
          data: {
            isActive: false,
            endsAt: now,
            endedById: authorization.user.id,
            changeReason,
          },
        });
      }

      await transaction.lecturerUnitAllocation.create({
        data: {
          intakeId,
          unitAssignmentId,
          lecturerId,
          allocatedById: authorization.user.id,
          allocationRole,
          isActive: true,
          startsAt: now,
          changeReason: changeReason || null,
        },
      });
    });

    revalidatePath(
      `/coordinator/courses/${courseId}/lecturer-allocations`,
    );

    revalidatePath(
      `/coordinator/courses/${courseId}/unit-assignments`,
    );

    revalidatePath(
      `/academic-director/courses/${courseId}`,
    );

    revalidatePath(
      `/lecturer/courses/${courseId}/curriculum`,
    );

    return {
      success: true,

      message: activePrimary
        ? `${lecturer.firstName} ${lecturer.lastName} is now the primary lecturer for ${approvedAssignment.unit.code} in ${intake.code}. The previous allocation was moved to history.`
        : `${lecturer.firstName} ${lecturer.lastName} was allocated to ${approvedAssignment.unit.code} in ${intake.code} successfully.`,
    };
  } catch (error) {
    console.error('[assignLecturerToUnit]', error);

    return {
      error: 'Failed to allocate the lecturer. Please try again.',
    };
  }
}

export async function endLecturerAllocation(
  formData: FormData,
): Promise<LecturerAllocationResult> {
  const allocationId = String(
    formData.get('allocationId') || '',
  ).trim();

  const reason = String(
    formData.get('reason') || '',
  ).trim();

  if (!allocationId) {
    return {
      error: 'Missing lecturer allocation ID.',
    };
  }

  if (!reason) {
    return {
      error: 'A reason is required when ending an allocation.',
    };
  }

  try {
    const allocation =
      await prisma.lecturerUnitAllocation.findUnique({
        where: {
          id: allocationId,
        },
        select: {
          id: true,
          isActive: true,

          lecturer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },

          intake: {
            select: {
              code: true,
            },
          },

          unitAssignment: {
            select: {
              unit: {
                select: {
                  code: true,
                  courseId: true,
                },
              },
            },
          },
        },
      });

    if (!allocation) {
      return {
        error: 'Lecturer allocation was not found.',
      };
    }

    if (!allocation.isActive) {
      return {
        error: 'This lecturer allocation has already ended.',
      };
    }

    const courseId =
      allocation.unitAssignment.unit.courseId;

    const authorization =
      await getAuthorizedCoordinator(courseId);

    if (!authorization.user) {
      return {
        error:
          authorization.error ||
          'You are not authorized to manage this course.',
      };
    }

    await prisma.lecturerUnitAllocation.update({
      where: {
        id: allocation.id,
      },
      data: {
        isActive: false,
        endsAt: new Date(),
        endedById: authorization.user.id,
        changeReason: reason,
      },
    });

    revalidatePath(
      `/coordinator/courses/${courseId}/lecturer-allocations`,
    );

    revalidatePath(
      `/academic-director/courses/${courseId}`,
    );

    revalidatePath(
      `/lecturer/courses/${courseId}/curriculum`,
    );

    return {
      success: true,
      message: `${allocation.lecturer.firstName} ${allocation.lecturer.lastName}'s allocation for ${allocation.unitAssignment.unit.code} in ${allocation.intake.code} has ended and was moved to history.`,
    };
  } catch (error) {
    console.error('[endLecturerAllocation]', error);

    return {
      error:
        'Failed to end the lecturer allocation. Please try again.',
    };
  }
}

function formatEnum(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}