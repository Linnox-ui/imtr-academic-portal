import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { SemesterUnitAssignmentManager } from './semester-unit-assignment-manager';

export const dynamic = 'force-dynamic';

type SemesterUnitAssignmentsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SemesterUnitAssignmentsPage({
  params,
}: SemesterUnitAssignmentsPageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/unauthorized');
  }

  const coordinatorAssignment =
    await prisma.courseCoordinatorAssignment.findFirst({
      where: {
        courseId: id,
        userId: session.user.id,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

  if (!coordinatorAssignment) {
    redirect('/unauthorized');
  }

  const course = await prisma.trainingCourse.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      code: true,
      title: true,
      category: true,
      units: {
        where: {
          isActive: true,
        },
        orderBy: {
          code: 'asc',
        },
        select: {
          id: true,
          code: true,
          title: true,
          isActive: true,
        },
      },
      courseYears: {
        orderBy: {
          sequence: 'asc',
        },
        select: {
          id: true,
          title: true,
          yearNumber: true,
          sequence: true,
          isActive: true,
          semesters: {
            orderBy: {
              sequence: 'asc',
            },
            select: {
              id: true,
              title: true,
              semesterNumber: true,
              sequence: true,
              periodType: true,
              isActive: true,
              unitAssignments: {
                orderBy: {
                  createdAt: 'asc',
                },
                select: {
                  id: true,
                  status: true,
                  submittedAt: true,
                  reviewedAt: true,
                  reviewNote: true,
                  rejectionReason: true,
                  unit: {
                    select: {
                      id: true,
                      code: true,
                      title: true,
                      isActive: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const serializedCourse = {
    id: course.id,
    code: course.code,
    title: course.title,
    category: String(course.category),
    units: course.units,
    years: course.courseYears.map((year) => ({
      id: year.id,
      title: year.title,
      yearNumber: year.yearNumber,
      sequence: year.sequence,
      isActive: year.isActive,
      semesters: year.semesters.map((semester) => ({
        id: semester.id,
        title: semester.title,
        semesterNumber: semester.semesterNumber,
        sequence: semester.sequence,
        periodType: String(semester.periodType),
        isActive: semester.isActive,
        assignments: semester.unitAssignments.map((assignment) => ({
          id: assignment.id,
          status: String(assignment.status),
          submittedAt: assignment.submittedAt?.toISOString() || null,
          reviewedAt: assignment.reviewedAt?.toISOString() || null,
          reviewNote: assignment.reviewNote,
          rejectionReason: assignment.rejectionReason,
          unit: assignment.unit,
        })),
      })),
    })),
  };

  return (
    <SemesterUnitAssignmentManager course={serializedCourse} />
  );
}