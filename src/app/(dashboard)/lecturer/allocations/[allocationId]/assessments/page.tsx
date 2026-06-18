import { redirect } from "next/navigation";
import { UnitAssignmentStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { LecturerAssessmentManager } from "./lecturer-assessment-manager";

export const dynamic = "force-dynamic";

type LecturerAssessmentsPageProps = {
  params: Promise<{
    allocationId: string;
  }>;
};

export default async function LecturerAssessmentsPage({
  params,
}: LecturerAssessmentsPageProps) {
  const { allocationId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/unauthorized");
  }

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
    currentUser.role.name !== "lecturer"
  ) {
    redirect("/unauthorized");
  }

  const allocation = await prisma.lecturerUnitAllocation.findFirst({
    where: {
      id: allocationId,
      lecturerId: currentUser.id,
      isActive: true,

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
      allocationRole: true,
      startsAt: true,

      intake: {
        select: {
          id: true,
          code: true,
          title: true,
          year: true,
          status: true,

          _count: {
            select: {
              students: true,
            },
          },

          course: {
            select: {
              id: true,
              code: true,
              title: true,
              category: true,
            },
          },
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
              description: true,
            },
          },

          semester: {
            select: {
              id: true,
              title: true,
              semesterNumber: true,
              periodType: true,

              courseYear: {
                select: {
                  id: true,
                  title: true,
                  yearNumber: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!allocation) {
    redirect("/unauthorized");
  }

  /*
   * Assessments are loaded using the intake and approved
   * semester-unit assignment rather than the lecturer allocation.
   *
   * This means assessments remain available if the primary lecturer
   * is switched later.
   */
  const assessments = await prisma.assessment.findMany({
    where: {
      intakeId: allocation.intake.id,
      unitAssignmentId: allocation.unitAssignment.id,
      isActive: true,
    },

    orderBy: {
      createdAt: "asc",
    },

    select: {
      id: true,
      code: true,
      title: true,
      type: true,
      maxMarks: true,
      weightPercent: true,
      assessmentDate: true,
      createdAt: true,

      createdBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },

      resultSubmission: {
        select: {
          id: true,
          status: true,
          version: true,
          submittedToCoordinatorAt: true,
          coordinatorReviewedAt: true,
          submittedToAcademicDirectorAt: true,
          academicReviewedAt: true,
          finalApprovedAt: true,
          publishedAt: true,

          _count: {
            select: {
              results: true,
            },
          },
        },
      },
    },
  });

  return (
    <LecturerAssessmentManager
      lecturer={{
        id: currentUser.id,
        name: `${currentUser.firstName} ${currentUser.lastName}`,
      }}
      allocation={{
        id: allocation.id,
        allocationRole: String(allocation.allocationRole),
        startsAt: allocation.startsAt.toISOString(),

        intake: {
          id: allocation.intake.id,
          code: allocation.intake.code,
          title: allocation.intake.title,
          year: allocation.intake.year,
          status: String(allocation.intake.status),
          studentCount: allocation.intake._count.students,

          course: {
            id: allocation.intake.course.id,
            code: allocation.intake.course.code,
            title: allocation.intake.course.title,
            category: String(allocation.intake.course.category),
          },
        },

        unitAssignment: {
          id: allocation.unitAssignment.id,

          unit: {
            id: allocation.unitAssignment.unit.id,
            code: allocation.unitAssignment.unit.code,
            title: allocation.unitAssignment.unit.title,
            description: allocation.unitAssignment.unit.description,
          },

          semester: {
            id: allocation.unitAssignment.semester.id,
            title: allocation.unitAssignment.semester.title,
            semesterNumber: allocation.unitAssignment.semester.semesterNumber,
            periodType: String(allocation.unitAssignment.semester.periodType),

            courseYear: {
              id: allocation.unitAssignment.semester.courseYear.id,
              title: allocation.unitAssignment.semester.courseYear.title,
              yearNumber:
                allocation.unitAssignment.semester.courseYear.yearNumber,
            },
          },
        },
      }}
      assessments={assessments.map((assessment) => ({
        id: assessment.id,
        code: assessment.code,
        title: assessment.title,
        type: String(assessment.type),
        maxMarks: assessment.maxMarks.toString(),

        weightPercent: assessment.weightPercent?.toString() || null,

        assessmentDate: assessment.assessmentDate?.toISOString() || null,

        createdAt: assessment.createdAt.toISOString(),

        createdBy: {
          firstName: assessment.createdBy.firstName,
          lastName: assessment.createdBy.lastName,
        },

        submission: assessment.resultSubmission
          ? {
              id: assessment.resultSubmission.id,
              status: String(assessment.resultSubmission.status),
              version: assessment.resultSubmission.version,
              resultCount: assessment.resultSubmission._count.results,

              submittedToCoordinatorAt:
                assessment.resultSubmission.submittedToCoordinatorAt?.toISOString() ||
                null,

              coordinatorReviewedAt:
                assessment.resultSubmission.coordinatorReviewedAt?.toISOString() ||
                null,

              submittedToAcademicDirectorAt:
                assessment.resultSubmission.submittedToAcademicDirectorAt?.toISOString() ||
                null,

              academicReviewedAt:
                assessment.resultSubmission.academicReviewedAt?.toISOString() ||
                null,

              finalApprovedAt:
                assessment.resultSubmission.finalApprovedAt?.toISOString() ||
                null,

              publishedAt:
                assessment.resultSubmission.publishedAt?.toISOString() || null,
            }
          : null,
      }))}
    />
  );
}
