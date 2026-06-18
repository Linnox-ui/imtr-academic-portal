'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type CoordinatorActionResult = {
  success?: boolean;
  message?: string;
  error?: string;
};

const ALLOWED_ADMIN_ROLES = ['super_admin', 'academic_director'];

async function getActingAcademicAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: 'You must be signed in.',
      user: null,
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
      error: 'Your user account was not found or is inactive.',
      user: null,
    };
  }

  if (!ALLOWED_ADMIN_ROLES.includes(user.role.name)) {
    return {
      error: 'Only the Academic Director or Super Admin can assign coordinators.',
      user: null,
    };
  }

  return {
    error: null,
    user,
  };
}

export async function assignCourseCoordinator(
  formData: FormData,
): Promise<CoordinatorActionResult> {
  const courseId = String(formData.get('courseId') || '').trim();
  const userId = String(formData.get('userId') || '').trim();

  if (!courseId || !userId) {
    return {
      error: 'Please select a coordinator.',
    };
  }

  const actingAdmin = await getActingAcademicAdmin();

  if (!actingAdmin.user) {
    return {
      error: actingAdmin.error || 'You are not permitted to perform this action.',
    };
  }

  try {
    const [course, coordinator] = await Promise.all([
      prisma.trainingCourse.findUnique({
        where: {
          id: courseId,
        },
        select: {
          id: true,
          code: true,
          title: true,
        },
      }),

      prisma.user.findUnique({
        where: {
          id: userId,
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
      }),
    ]);

    if (!course) {
      return {
        error: 'The selected course was not found.',
      };
    }

    if (!coordinator || !coordinator.isActive) {
      return {
        error: 'The selected coordinator account was not found or is inactive.',
      };
    }

    if (coordinator.role.name !== 'coordinator') {
      return {
        error: 'Only users with the coordinator role can be assigned.',
      };
    }

    const existingAssignment =
      await prisma.courseCoordinatorAssignment.findUnique({
        where: {
          courseId_userId: {
            courseId,
            userId,
          },
        },
      });

    if (existingAssignment?.isActive) {
      return {
        error: `${coordinator.firstName} ${coordinator.lastName} is already assigned to this course.`,
      };
    }

    if (existingAssignment) {
      await prisma.courseCoordinatorAssignment.update({
        where: {
          id: existingAssignment.id,
        },
        data: {
          assignedById: actingAdmin.user.id,
          assignedAt: new Date(),
          endedAt: null,
          isActive: true,
        },
      });
    } else {
      await prisma.courseCoordinatorAssignment.create({
        data: {
          courseId,
          userId,
          assignedById: actingAdmin.user.id,
          isActive: true,
        },
      });
    }

    revalidatePath(`/academic-director/courses/${courseId}`);
    revalidatePath(`/academic-director/courses/${courseId}/coordinators`);

    return {
      success: true,
      message: `${coordinator.firstName} ${coordinator.lastName} assigned to ${course.code} successfully.`,
    };
  } catch (error) {
    console.error('[assignCourseCoordinator]', error);

    return {
      error: 'Failed to assign the course coordinator.',
    };
  }
}

export async function toggleCourseCoordinatorStatus(
  assignmentId: string,
): Promise<CoordinatorActionResult> {
  if (!assignmentId) {
    return {
      error: 'Missing coordinator assignment ID.',
    };
  }

  const actingAdmin = await getActingAcademicAdmin();

  if (!actingAdmin.user) {
    return {
      error: actingAdmin.error || 'You are not permitted to perform this action.',
    };
  }

  try {
    const assignment =
      await prisma.courseCoordinatorAssignment.findUnique({
        where: {
          id: assignmentId,
        },
        include: {
          course: {
            select: {
              id: true,
              code: true,
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

    if (!assignment) {
      return {
        error: 'Coordinator assignment was not found.',
      };
    }

    const nextStatus = !assignment.isActive;

    await prisma.courseCoordinatorAssignment.update({
      where: {
        id: assignmentId,
      },
      data: {
        isActive: nextStatus,
        assignedById: actingAdmin.user.id,
        assignedAt: nextStatus ? new Date() : assignment.assignedAt,
        endedAt: nextStatus ? null : new Date(),
      },
    });

    revalidatePath(
      `/academic-director/courses/${assignment.course.id}`,
    );

    revalidatePath(
      `/academic-director/courses/${assignment.course.id}/coordinators`,
    );

    return {
      success: true,
      message: nextStatus
        ? `${assignment.user.firstName} ${assignment.user.lastName} reactivated as coordinator.`
        : `${assignment.user.firstName} ${assignment.user.lastName} removed from the active coordinators.`,
    };
  } catch (error) {
    console.error('[toggleCourseCoordinatorStatus]', error);

    return {
      error: 'Failed to update the coordinator assignment.',
    };
  }
}