'use server';

import { revalidatePath } from 'next/cache';
import { UnitAssignmentStatus } from '@prisma/client';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type ReviewDecision = 'APPROVE' | 'REJECT' | 'AMENDMENT';

type ReviewActionResult = {
  success?: boolean;
  message?: string;
  error?: string;
};

const ACADEMIC_ADMIN_ROLES = [
  'super_admin',
  'academic_director',
];

async function getAuthorizedAcademicAdmin() {
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

  if (!ACADEMIC_ADMIN_ROLES.includes(user.role.name)) {
    return {
      user: null,
      error:
        'Only the Academic Director or Super Admin can review semester-unit assignments.',
    };
  }

  return {
    user,
    error: null,
  };
}

export async function reviewSemesterUnitAssignments(
  formData: FormData,
): Promise<ReviewActionResult> {
  const courseId = String(
    formData.get('courseId') || '',
  ).trim();

  const semesterId = String(
    formData.get('semesterId') || '',
  ).trim();

  const decision = String(
    formData.get('decision') || '',
  ).trim() as ReviewDecision;

  const note = String(
    formData.get('note') || '',
  ).trim();

  const validDecisions: ReviewDecision[] = [
    'APPROVE',
    'REJECT',
    'AMENDMENT',
  ];

  if (!courseId || !semesterId) {
    return {
      error: 'Missing course or semester information.',
    };
  }

  if (!validDecisions.includes(decision)) {
    return {
      error: 'Invalid review decision.',
    };
  }

  if (
    (decision === 'REJECT' ||
      decision === 'AMENDMENT') &&
    !note
  ) {
    return {
      error:
        decision === 'REJECT'
          ? 'A rejection reason is required.'
          : 'Please explain the amendments required.',
    };
  }

  const authorization =
    await getAuthorizedAcademicAdmin();

  if (!authorization.user) {
    return {
      error:
        authorization.error ||
        'You are not authorized to review assignments.',
    };
  }

  try {
    const semester =
      await prisma.courseSemester.findFirst({
        where: {
          id: semesterId,
          courseYear: {
            courseId,
          },
        },
        select: {
          id: true,
          title: true,
          courseYear: {
            select: {
              title: true,
              course: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                },
              },
            },
          },
          unitAssignments: {
            where: {
              status: UnitAssignmentStatus.SUBMITTED,
            },
            select: {
              id: true,
              submittedById: true,
            },
          },
        },
      });

    if (!semester) {
      return {
        error:
          'The selected semester does not belong to this course.',
      };
    }

    if (semester.unitAssignments.length === 0) {
      return {
        error:
          'There are no submitted assignments awaiting review in this semester.',
      };
    }

    const submittedByReviewer =
      semester.unitAssignments.some(
        (assignment) =>
          assignment.submittedById ===
          authorization.user.id,
      );

    if (submittedByReviewer) {
      return {
        error:
          'You cannot review semester assignments that you submitted yourself.',
      };
    }

    const reviewedAt = new Date();

    let nextStatus: UnitAssignmentStatus;
    let successMessage: string;

    if (decision === 'APPROVE') {
      nextStatus = UnitAssignmentStatus.APPROVED;
      successMessage = `${semester.courseYear.title} — ${semester.title} assignments approved successfully.`;
    } else if (decision === 'REJECT') {
      nextStatus = UnitAssignmentStatus.REJECTED;
      successMessage = `${semester.courseYear.title} — ${semester.title} assignments rejected.`;
    } else {
      nextStatus =
        UnitAssignmentStatus.AMENDMENT_REQUESTED;
      successMessage = `Amendments requested for ${semester.courseYear.title} — ${semester.title}.`;
    }

    const result =
      await prisma.semesterUnitAssignment.updateMany({
        where: {
          semesterId,
          status: UnitAssignmentStatus.SUBMITTED,
        },
        data: {
          status: nextStatus,
          reviewedById: authorization.user.id,
          reviewedAt,

          reviewNote:
            decision === 'APPROVE' ||
            decision === 'AMENDMENT'
              ? note || null
              : null,

          rejectionReason:
            decision === 'REJECT'
              ? note
              : null,
        },
      });

    if (result.count === 0) {
      return {
        error:
          'No submitted assignments were updated. They may already have been reviewed.',
      };
    }

    revalidatePath(
      '/academic-director/unit-approvals',
    );

    revalidatePath(
      `/academic-director/courses/${courseId}`,
    );

    revalidatePath(
      `/academic-director/courses/${courseId}/structure`,
    );

    revalidatePath(
      `/coordinator/courses/${courseId}/unit-assignments`,
    );

    return {
      success: true,
      message: `${successMessage} ${result.count} unit assignment${
        result.count === 1 ? '' : 's'
      } reviewed.`,
    };
  } catch (error) {
    console.error(
      '[reviewSemesterUnitAssignments]',
      error,
    );

    return {
      error:
        'Failed to review the semester-unit assignments.',
    };
  }
}