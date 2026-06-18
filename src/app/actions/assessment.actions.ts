'use server';

import { revalidatePath } from 'next/cache';
import {
  AssessmentType,
  LecturerAllocationRole,
  Prisma,
  ResultWorkflowAction,
  ResultWorkflowStatus,
  UnitAssignmentStatus,
} from '@prisma/client';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type AssessmentActionResult = {
  success?: boolean;
  assessmentId?: string;
  submissionId?: string;
  message?: string;
  error?: string;
};

const ALLOWED_CAT_TYPES: AssessmentType[] = [
  AssessmentType.CAT_1,
  AssessmentType.CAT_2,
];

function normalizeAssessmentCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_-]/g, '');
}

function getDefaultAssessmentDetails(type: AssessmentType) {
  if (type === AssessmentType.CAT_1) {
    return {
      code: 'CAT1',
      title: 'Continuous Assessment Test 1',
    };
  }

  return {
    code: 'CAT2',
    title: 'Continuous Assessment Test 2',
  };
}

export async function createCatAssessment(
  formData: FormData,
): Promise<AssessmentActionResult> {
  const allocationId = String(
    formData.get('allocationId') ?? '',
  ).trim();

  const assessmentTypeValue = String(
    formData.get('assessmentType') ?? '',
  ).trim();

  const customCode = normalizeAssessmentCode(
    String(formData.get('code') ?? ''),
  );

  const customTitle = String(
    formData.get('title') ?? '',
  ).trim();

  const maxMarksValue = String(
    formData.get('maxMarks') ?? '',
  ).trim();

  const weightPercentValue = String(
    formData.get('weightPercent') ?? '',
  ).trim();

  const assessmentDateValue = String(
    formData.get('assessmentDate') ?? '',
  ).trim();

  if (!allocationId) {
    return {
      error: 'Missing lecturer allocation information.',
    };
  }

  if (
    !ALLOWED_CAT_TYPES.includes(
      assessmentTypeValue as AssessmentType,
    )
  ) {
    return {
      error: 'Select CAT 1 or CAT 2.',
    };
  }

  const assessmentType =
    assessmentTypeValue as AssessmentType;

  const maxMarks = Number(maxMarksValue);

  if (
    !Number.isFinite(maxMarks) ||
    maxMarks <= 0 ||
    maxMarks > 1000
  ) {
    return {
      error:
        'Maximum marks must be greater than zero and not exceed 1000.',
    };
  }

  let weightPercent: number | null = null;

  if (weightPercentValue) {
    weightPercent = Number(weightPercentValue);

    if (
      !Number.isFinite(weightPercent) ||
      weightPercent < 0 ||
      weightPercent > 100
    ) {
      return {
        error:
          'Assessment weight must be between 0 and 100 percent.',
      };
    }
  }

  let assessmentDate: Date | null = null;

  if (assessmentDateValue) {
    assessmentDate = new Date(assessmentDateValue);

    if (Number.isNaN(assessmentDate.getTime())) {
      return {
        error: 'Enter a valid assessment date.',
      };
    }
  }

  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: 'You must be signed in.',
    };
  }

  try {
    const currentUser = await prisma.user.findUnique({
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

    if (
      !currentUser ||
      !currentUser.isActive ||
      currentUser.role.name !== 'lecturer'
    ) {
      return {
        error:
          'Only an active lecturer account can create CAT assessments.',
      };
    }

    const allocation =
      await prisma.lecturerUnitAllocation.findFirst({
        where: {
          id: allocationId,
          lecturerId: currentUser.id,
          isActive: true,
          allocationRole:
            LecturerAllocationRole.PRIMARY,

          unitAssignment: {
            status: UnitAssignmentStatus.APPROVED,

            unit: {
              isActive: true,
            },

            semester: {
              isActive: true,

              courseYear: {
                isActive: true,
              },
            },
          },
        },

        select: {
          id: true,
          intakeId: true,
          unitAssignmentId: true,

          intake: {
            select: {
              id: true,
              code: true,
              title: true,
              courseId: true,
            },
          },

          unitAssignment: {
            select: {
              id: true,

              unit: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  courseId: true,
                },
              },

              semester: {
                select: {
                  id: true,
                  title: true,

                  courseYear: {
                    select: {
                      id: true,
                      title: true,
                      courseId: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!allocation) {
      return {
        error:
          'You must be the active primary lecturer for this approved unit before creating CAT assessments.',
      };
    }

    const intakeCourseId =
      allocation.intake.courseId;

    const unitCourseId =
      allocation.unitAssignment.unit.courseId;

    const semesterCourseId =
      allocation.unitAssignment.semester.courseYear
        .courseId;

    if (
      intakeCourseId !== unitCourseId ||
      intakeCourseId !== semesterCourseId
    ) {
      return {
        error:
          'The lecturer allocation contains inconsistent course information.',
      };
    }

    const defaults =
      getDefaultAssessmentDetails(assessmentType);

    const code = customCode || defaults.code;
    const title = customTitle || defaults.title;

    const duplicateAssessment =
      await prisma.assessment.findFirst({
        where: {
          intakeId: allocation.intakeId,

          unitAssignmentId:
            allocation.unitAssignmentId,

          OR: [
            {
              code,
            },
            {
              type: assessmentType,
              isActive: true,
            },
          ],
        },

        select: {
          id: true,
          code: true,
          title: true,
          type: true,
        },
      });

    if (duplicateAssessment) {
      return {
        error: `${formatEnum(
          String(duplicateAssessment.type),
        )} already exists for ${
          allocation.unitAssignment.unit.code
        } in ${allocation.intake.code}.`,
      };
    }

    const created = await prisma.$transaction(
      async (transaction) => {
        const assessment =
          await transaction.assessment.create({
            data: {
              code,
              title,
              type: assessmentType,

              maxMarks:
                new Prisma.Decimal(maxMarksValue),

              weightPercent:
                weightPercentValue &&
                weightPercent !== null
                  ? new Prisma.Decimal(
                      weightPercentValue,
                    )
                  : null,

              assessmentDate,
              isActive: true,

              intakeId:
                allocation.intakeId,

              unitAssignmentId:
                allocation.unitAssignmentId,

              lecturerAllocationId:
                allocation.id,

              createdById:
                currentUser.id,
            },
          });

        const submission =
          await transaction.resultSubmission.create({
            data: {
              assessmentId:
                assessment.id,

              status:
                ResultWorkflowStatus.DRAFT,

              version: 1,

              createdById:
                currentUser.id,
            },
          });

        await transaction.resultWorkflowHistory.create(
          {
            data: {
              submissionId:
                submission.id,

              action:
                ResultWorkflowAction.CREATED,

              fromStatus: null,

              toStatus:
                ResultWorkflowStatus.DRAFT,

              performedById:
                currentUser.id,

              comment: `${assessment.code} assessment and draft result sheet created.`,
            },
          },
        );

        return {
          assessment,
          submission,
        };
      },
    );

    revalidatePath('/lecturer/my-units');

    revalidatePath(
      `/lecturer/allocations/${allocation.id}/assessments`,
    );

    revalidatePath(
      `/lecturer/allocations/${allocation.id}/assessments/${created.assessment.id}`,
    );

    revalidatePath(
      `/coordinator/courses/${intakeCourseId}/lecturer-allocations`,
    );

    return {
      success: true,

      assessmentId:
        created.assessment.id,

      submissionId:
        created.submission.id,

      message: `${code} created successfully for ${allocation.unitAssignment.unit.code} — ${allocation.intake.code}.`,
    };
  } catch (error) {
    console.error(
      '[createCatAssessment]',
      error,
    );

    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        error:
          'This assessment already exists for the selected intake and unit.',
      };
    }

    return {
      error:
        'Failed to create the CAT assessment. Please try again.',
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