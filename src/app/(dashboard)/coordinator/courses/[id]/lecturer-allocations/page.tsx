import { notFound, redirect } from 'next/navigation';
import { UnitAssignmentStatus } from '@prisma/client';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { LecturerAllocationManager } from './lecturer-allocation-manager';

export const dynamic = 'force-dynamic';

type LecturerAllocationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LecturerAllocationPage({
  params,
}: LecturerAllocationPageProps) {
  const { id: courseId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/unauthorized');
  }

  const coordinatorAssignment =
    await prisma.courseCoordinatorAssignment.findFirst({
      where: {
        courseId,
        userId: session.user.id,
        isActive: true,
        user: {
          isActive: true,
          role: {
            name: 'coordinator',
          },
        },
      },
      select: {
        id: true,
      },
    });

  if (!coordinatorAssignment) {
    redirect('/unauthorized');
  }

  const [
    course,
    approvedAssignments,
    lecturers,
    allocations,
  ] = await Promise.all([
    prisma.trainingCourse.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
        code: true,
        title: true,
        category: true,

        intakes: {
          orderBy: [
            {
              year: 'desc',
            },
            {
              createdAt: 'desc',
            },
          ],
          select: {
            id: true,
            code: true,
            title: true,
            year: true,
            status: true,
          },
        },
      },
    }),

    prisma.semesterUnitAssignment.findMany({
      where: {
        status: UnitAssignmentStatus.APPROVED,

        unit: {
          courseId,
          isActive: true,
        },

        semester: {
          isActive: true,

          courseYear: {
            courseId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        reviewedAt: true,

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
            sequence: true,
            periodType: true,

            courseYear: {
              select: {
                id: true,
                title: true,
                yearNumber: true,
                sequence: true,
              },
            },
          },
        },
      },
    }),

    prisma.user.findMany({
      where: {
        isActive: true,

        role: {
          name: 'lecturer',
        },
      },
      orderBy: [
        {
          firstName: 'asc',
        },
        {
          lastName: 'asc',
        },
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    }),

    prisma.lecturerUnitAllocation.findMany({
      where: {
        unitAssignment: {
          unit: {
            courseId,
          },
        },
      },
      orderBy: [
        {
          isActive: 'desc',
        },
        {
          startsAt: 'desc',
        },
      ],
      select: {
        id: true,
        allocationRole: true,
        isActive: true,
        startsAt: true,
        endsAt: true,
        changeReason: true,

        intake: {
          select: {
            id: true,
            code: true,
            title: true,
            year: true,
          },
        },

        lecturer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },

        allocatedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },

        endedBy: {
          select: {
            firstName: true,
            lastName: true,
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
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  if (!course) {
    notFound();
  }

  const sortedApprovedAssignments = [...approvedAssignments].sort(
    (first, second) => {
      const yearDifference =
        first.semester.courseYear.sequence -
        second.semester.courseYear.sequence;

      if (yearDifference !== 0) {
        return yearDifference;
      }

      const semesterDifference =
        first.semester.sequence - second.semester.sequence;

      if (semesterDifference !== 0) {
        return semesterDifference;
      }

      return first.unit.code.localeCompare(second.unit.code);
    },
  );

  return (
    <LecturerAllocationManager
      course={{
        id: course.id,
        code: course.code,
        title: course.title,
        category: String(course.category),
      }}
      intakes={course.intakes.map((intake) => ({
        id: intake.id,
        code: intake.code,
        title: intake.title,
        year: intake.year,
        status: String(intake.status),
      }))}
      approvedAssignments={sortedApprovedAssignments.map(
        (assignment) => ({
          id: assignment.id,

          reviewedAt:
            assignment.reviewedAt?.toISOString() || null,

          unit: {
            id: assignment.unit.id,
            code: assignment.unit.code,
            title: assignment.unit.title,
          },

          semester: {
            id: assignment.semester.id,
            title: assignment.semester.title,
            periodType: String(
              assignment.semester.periodType,
            ),

            courseYear: {
              id: assignment.semester.courseYear.id,
              title:
                assignment.semester.courseYear.title,
              yearNumber:
                assignment.semester.courseYear.yearNumber,
              sequence:
                assignment.semester.courseYear.sequence,
            },
          },
        }),
      )}
      lecturers={lecturers}
      allocations={allocations.map((allocation) => ({
        id: allocation.id,
        allocationRole: String(
          allocation.allocationRole,
        ),
        isActive: allocation.isActive,
        startsAt: allocation.startsAt.toISOString(),

        endsAt:
          allocation.endsAt?.toISOString() || null,

        changeReason: allocation.changeReason,

        intake: {
          id: allocation.intake.id,
          code: allocation.intake.code,
          title: allocation.intake.title,
          year: allocation.intake.year,
        },

        lecturer: {
          id: allocation.lecturer.id,
          firstName: allocation.lecturer.firstName,
          lastName: allocation.lecturer.lastName,
          email: allocation.lecturer.email,
        },

        allocatedBy: {
          firstName: allocation.allocatedBy.firstName,
          lastName: allocation.allocatedBy.lastName,
        },

        endedBy: allocation.endedBy
          ? {
              firstName:
                allocation.endedBy.firstName,
              lastName:
                allocation.endedBy.lastName,
            }
          : null,

        unitAssignment: {
          id: allocation.unitAssignment.id,

          unit: {
            id: allocation.unitAssignment.unit.id,
            code: allocation.unitAssignment.unit.code,
            title:
              allocation.unitAssignment.unit.title,
          },

          semester: {
            id: allocation.unitAssignment.semester.id,
            title:
              allocation.unitAssignment.semester.title,

            courseYear: {
              id:
                allocation.unitAssignment.semester
                  .courseYear.id,

              title:
                allocation.unitAssignment.semester
                  .courseYear.title,
            },
          },
        },
      }))}
    />
  );
}