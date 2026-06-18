import { UnitAssignmentStatus } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export async function getApprovedCourseCurriculum(courseId: string) {
  const course = await prisma.trainingCourse.findUnique({
    where: {
      id: courseId,
    },
    select: {
      id: true,
      code: true,
      title: true,
      category: true,
      description: true,

      courseYears: {
        where: {
          isActive: true,
        },
        orderBy: {
          sequence: 'asc',
        },
        select: {
          id: true,
          title: true,
          yearNumber: true,
          sequence: true,

          semesters: {
            where: {
              isActive: true,
              unitAssignments: {
                some: {
                  status: UnitAssignmentStatus.APPROVED,
                },
              },
            },
            orderBy: {
              sequence: 'asc',
            },
            select: {
              id: true,
              title: true,
              semesterNumber: true,
              sequence: true,
              periodType: true,

              unitAssignments: {
                where: {
                  status: UnitAssignmentStatus.APPROVED,
                  unit: {
                    is: {
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
                      description: true,
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
    return null;
  }

  return {
    id: course.id,
    code: course.code,
    title: course.title,
    category: String(course.category),
    description: course.description,

    years: course.courseYears
      .map((year) => ({
        id: year.id,
        title: year.title,
        yearNumber: year.yearNumber,
        sequence: year.sequence,

        semesters: year.semesters
          .map((semester) => ({
            id: semester.id,
            title: semester.title,
            semesterNumber: semester.semesterNumber,
            sequence: semester.sequence,
            periodType: String(semester.periodType),

            units: semester.unitAssignments
              .map((assignment) => ({
                assignmentId: assignment.id,
                reviewedAt:
                  assignment.reviewedAt?.toISOString() || null,
                id: assignment.unit.id,
                code: assignment.unit.code,
                title: assignment.unit.title,
                description: assignment.unit.description,
              }))
              .sort((first, second) =>
                first.code.localeCompare(second.code),
              ),
          }))
          .filter((semester) => semester.units.length > 0),
      }))
      .filter((year) => year.semesters.length > 0),
  };
}

export async function getStudentCourseIdByEmail(email: string) {
  const student = await prisma.student.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
      courseCode: true,
    },
  });

  if (!student) {
    return null;
  }

  const intake = await prisma.intake.findFirst({
    where: {
      code: student.courseCode,
    },
    select: {
      courseId: true,
    },
  });

  return intake?.courseId || null;
}

export type ApprovedCourseCurriculum = NonNullable<
  Awaited<ReturnType<typeof getApprovedCourseCurriculum>>
>;