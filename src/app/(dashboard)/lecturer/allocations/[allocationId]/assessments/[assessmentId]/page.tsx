import { notFound, redirect } from "next/navigation";
import { LecturerAllocationRole, UnitAssignmentStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResultEntryManager } from "./result-entry-manager";
export const dynamic = "force-dynamic";
type ResultEntryPageProps = {
  params: Promise<{ allocationId: string; assessmentId: string }>;
};
export default async function ResultEntryPage({
  params,
}: ResultEntryPageProps) {
  const { allocationId, assessmentId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/unauthorized");
  }
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      role: { select: { name: true } },
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
      allocationRole: LecturerAllocationRole.PRIMARY,
      unitAssignment: {
        status: UnitAssignmentStatus.APPROVED,
        unit: { isActive: true },
        semester: { isActive: true, courseYear: { isActive: true } },
      },
    },
    select: {
      id: true,
      allocationRole: true,
      intake: {
        select: {
          id: true,
          code: true,
          title: true,
          year: true,
          status: true,
          course: {
            select: { id: true, code: true, title: true, category: true },
          },
        },
      },
      unitAssignment: {
        select: {
          id: true,
          unit: {
            select: { id: true, code: true, title: true, description: true },
          },
          semester: {
            select: {
              id: true,
              title: true,
              semesterNumber: true,
              periodType: true,
              courseYear: {
                select: { id: true, title: true, yearNumber: true },
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
  const [assessment, students] = await Promise.all([
    prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        intakeId: allocation.intake.id,
        unitAssignmentId: allocation.unitAssignment.id,
        isActive: true,
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
        createdBy: { select: { firstName: true, lastName: true } },
        resultSubmission: {
          select: {
            id: true,
            status: true,
            version: true,
            submittedToCoordinatorAt: true,
            coordinatorReviewedAt: true,
            coordinatorComment: true,
            submittedToAcademicDirectorAt: true,
            academicReviewedAt: true,
            academicComment: true,
            finalApprovedAt: true,
            publishedAt: true,
            results: {
              select: {
                id: true,
                studentProfileId: true,
                marks: true,
                isAbsent: true,
                isExempted: true,
                remarks: true,
                createdAt: true,
                updatedAt: true,
                enteredBy: { select: { firstName: true, lastName: true } },
                lastEditedBy: { select: { firstName: true, lastName: true } },
              },
            },
            workflowHistory: {
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                action: true,
                fromStatus: true,
                toStatus: true,
                comment: true,
                createdAt: true,
                performedBy: {
                  select: {
                    firstName: true,
                    lastName: true,
                    role: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.studentProfile.findMany({
      where: { intakeId: allocation.intake.id },
      orderBy: { admissionNumber: "asc" },
      select: {
        id: true,
        admissionNumber: true,
        academicStatus: true,
        enrollmentDate: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
          },
        },
      },
    }),
  ]);
  if (!assessment || !assessment.resultSubmission) {
    notFound();
  }
  const existingResults = new Map(
    assessment.resultSubmission.results.map((result) => [
      result.studentProfileId,
      result,
    ]),
  );
  const serializedStudents = students.map((student) => {
    const result = existingResults.get(student.id);
    return {
      id: student.id,
      admissionNumber: student.admissionNumber,
      academicStatus: student.academicStatus,
      enrollmentDate: student.enrollmentDate.toISOString(),
      user: {
        id: student.user.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        email: student.user.email,
        isActive: student.user.isActive,
      },
      result: result
        ? {
            id: result.id,
            marks: result.marks?.toString() ?? "",
            isAbsent: result.isAbsent,
            isExempted: result.isExempted,
            remarks: result.remarks ?? "",
            createdAt: result.createdAt.toISOString(),
            updatedAt: result.updatedAt.toISOString(),
            enteredBy: {
              firstName: result.enteredBy.firstName,
              lastName: result.enteredBy.lastName,
            },
            lastEditedBy: result.lastEditedBy
              ? {
                  firstName: result.lastEditedBy.firstName,
                  lastName: result.lastEditedBy.lastName,
                }
              : null,
          }
        : null,
    };
  });
  const workflowHistory = assessment.resultSubmission.workflowHistory.map(
    (history) => ({
      id: history.id,
      action: String(history.action),
      fromStatus: history.fromStatus ? String(history.fromStatus) : null,
      toStatus: String(history.toStatus),
      comment: history.comment,
      createdAt: history.createdAt.toISOString(),
      performedBy: {
        firstName: history.performedBy.firstName,
        lastName: history.performedBy.lastName,
        role: history.performedBy.role.name,
      },
    }),
  );
  return (
    <ResultEntryManager
      lecturer={{
        id: currentUser.id,
        name: `${currentUser.firstName} ${currentUser.lastName}`,
        email: currentUser.email,
      }}
      allocation={{
        id: allocation.id,
        allocationRole: String(allocation.allocationRole),
        intake: {
          id: allocation.intake.id,
          code: allocation.intake.code,
          title: allocation.intake.title,
          year: allocation.intake.year,
          status: String(allocation.intake.status),
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
      assessment={{
        id: assessment.id,
        code: assessment.code,
        title: assessment.title,
        type: String(assessment.type),
        maxMarks: assessment.maxMarks.toString(),
        weightPercent: assessment.weightPercent?.toString() ?? null,
        assessmentDate: assessment.assessmentDate?.toISOString() ?? null,
        createdAt: assessment.createdAt.toISOString(),
        createdBy: {
          firstName: assessment.createdBy.firstName,
          lastName: assessment.createdBy.lastName,
        },
        submission: {
          id: assessment.resultSubmission.id,
          status: String(assessment.resultSubmission.status),
          version: assessment.resultSubmission.version,
          submittedToCoordinatorAt:
            assessment.resultSubmission.submittedToCoordinatorAt?.toISOString() ??
            null,
          coordinatorReviewedAt:
            assessment.resultSubmission.coordinatorReviewedAt?.toISOString() ??
            null,
          coordinatorComment: assessment.resultSubmission.coordinatorComment,
          submittedToAcademicDirectorAt:
            assessment.resultSubmission.submittedToAcademicDirectorAt?.toISOString() ??
            null,
          academicReviewedAt:
            assessment.resultSubmission.academicReviewedAt?.toISOString() ??
            null,
          academicComment: assessment.resultSubmission.academicComment,
          finalApprovedAt:
            assessment.resultSubmission.finalApprovedAt?.toISOString() ?? null,
          publishedAt:
            assessment.resultSubmission.publishedAt?.toISOString() ?? null,
        },
      }}
      students={serializedStudents}
      workflowHistory={workflowHistory}
    />
  );
}
