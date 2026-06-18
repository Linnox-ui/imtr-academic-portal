"use server";
import { revalidatePath } from "next/cache";
import { ResultWorkflowAction, ResultWorkflowStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
type CoordinatorReviewDecision =
  | "FORWARD_TO_ACADEMIC_DIRECTOR"
  | "RETURN_TO_LECTURER";
type CoordinatorReviewResult = {
  success?: boolean;
  message?: string;
  error?: string;
};
const REVIEWABLE_STATUSES: ResultWorkflowStatus[] = [
  ResultWorkflowStatus.SUBMITTED_TO_COORDINATOR,
  ResultWorkflowStatus.RETURNED_TO_COORDINATOR,
];
async function getAuthorizedCoordinator(courseId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { user: null, error: "You must be signed in." };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      isActive: true,
      role: { select: { name: true } },
    },
  });
  if (!user || !user.isActive) {
    return {
      user: null,
      error: "Your coordinator account was not found or is inactive.",
    };
  }
  if (user.role.name !== "coordinator") {
    return {
      user: null,
      error: "Only a course coordinator can review submitted results.",
    };
  }
  const coordinatorAssignment =
    await prisma.courseCoordinatorAssignment.findFirst({
      where: { courseId, userId: user.id, isActive: true },
      select: { id: true },
    });
  if (!coordinatorAssignment) {
    return {
      user: null,
      error: "You are not the active coordinator for this course.",
    };
  }
  return { user, error: null };
}
export async function reviewResultsByCoordinator(
  formData: FormData,
): Promise<CoordinatorReviewResult> {
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const decisionValue = String(formData.get("decision") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();
  if (!submissionId) {
    return { error: "Missing result submission information." };
  }
  const validDecisions: CoordinatorReviewDecision[] = [
    "FORWARD_TO_ACADEMIC_DIRECTOR",
    "RETURN_TO_LECTURER",
  ];
  if (!validDecisions.includes(decisionValue as CoordinatorReviewDecision)) {
    return { error: "Invalid coordinator review decision." };
  }
  const decision = decisionValue as CoordinatorReviewDecision;
  if (decision === "RETURN_TO_LECTURER" && !comment) {
    return {
      error:
        "Explain the corrections required before returning results to the lecturer.",
    };
  }
  try {
    const submission = await prisma.resultSubmission.findUnique({
      where: { id: submissionId },
      select: {
        id: true,
        status: true,
        version: true,
        assessment: {
          select: {
            id: true,
            code: true,
            title: true,
            maxMarks: true,
            lecturerAllocation: { select: { id: true } },
            intake: {
              select: {
                id: true,
                code: true,
                courseId: true,
                _count: { select: { students: true } },
              },
            },
            unitAssignment: {
              select: {
                id: true,
                unit: {
                  select: { id: true, code: true, title: true, courseId: true },
                },
                semester: {
                  select: {
                    title: true,
                    courseYear: { select: { title: true, courseId: true } },
                  },
                },
              },
            },
          },
        },
        results: {
          select: {
            id: true,
            studentProfileId: true,
            marks: true,
            isAbsent: true,
            isExempted: true,
            studentProfile: {
              select: { intakeId: true, admissionNumber: true },
            },
          },
        },
      },
    });
    if (!submission) {
      return { error: "The submitted result sheet was not found." };
    }
    if (!REVIEWABLE_STATUSES.includes(submission.status)) {
      return {
        error: `This result sheet cannot be reviewed while its status is ${formatEnum(String(submission.status))}.`,
      };
    }
    const courseId = submission.assessment.intake.courseId;
    const unitCourseId = submission.assessment.unitAssignment.unit.courseId;
    const semesterCourseId =
      submission.assessment.unitAssignment.semester.courseYear.courseId;
    if (courseId !== unitCourseId || courseId !== semesterCourseId) {
      return {
        error:
          "The result submission contains inconsistent course information.",
      };
    }
    const authorization = await getAuthorizedCoordinator(courseId);
    if (!authorization.user) {
      return {
        error:
          authorization.error ||
          "You are not authorized to review these results.",
      };
    }
    /* * Returning results does not require a complete sheet because * the coordinator may be returning it specifically due to * missing or incorrect entries. * * Forwarding to the Academic Director requires full validation. */ if (
      decision === "FORWARD_TO_ACADEMIC_DIRECTOR"
    ) {
      const expectedStudentCount = submission.assessment.intake._count.students;
      if (expectedStudentCount === 0) {
        return { error: "The selected intake has no admitted students." };
      }
      if (submission.results.length !== expectedStudentCount) {
        return {
          error: `The result sheet is incomplete. It contains ${submission.results.length} of ${expectedStudentCount} student results.`,
        };
      }
      const duplicateStudentIds = submission.results
        .map((result) => result.studentProfileId)
        .filter(
          (studentProfileId, index, allIds) =>
            allIds.indexOf(studentProfileId) !== index,
        );
      if (duplicateStudentIds.length > 0) {
        return {
          error: "The result sheet contains duplicate student records.",
        };
      }
      for (const result of submission.results) {
        if (
          result.studentProfile.intakeId !== submission.assessment.intake.id
        ) {
          return {
            error: `${result.studentProfile.admissionNumber} does not belong to the selected intake.`,
          };
        }
        if (result.isAbsent && result.isExempted) {
          return {
            error: `${result.studentProfile.admissionNumber} cannot be both absent and exempted.`,
          };
        }
        if (result.marks !== null && (result.isAbsent || result.isExempted)) {
          return {
            error: `${result.studentProfile.admissionNumber} has marks despite being absent or exempted.`,
          };
        }
        if (result.marks === null && !result.isAbsent && !result.isExempted) {
          return {
            error: `${result.studentProfile.admissionNumber} has no marks, absence, or exemption recorded.`,
          };
        }
        if (
          result.marks !== null &&
          (result.marks.isNegative() ||
            result.marks.greaterThan(submission.assessment.maxMarks))
        ) {
          return {
            error: `${result.studentProfile.admissionNumber} has marks outside the allowed range.`,
          };
        }
      }
    }
    const reviewedAt = new Date();
    if (decision === "RETURN_TO_LECTURER") {
      await prisma.$transaction(async (transaction) => {
        await transaction.resultSubmission.update({
          where: { id: submission.id },
          data: {
            status: ResultWorkflowStatus.RETURNED_TO_LECTURER,
            coordinatorReviewedById: authorization.user.id,
            coordinatorReviewedAt: reviewedAt,
            coordinatorComment: comment,
          },
        });
        await transaction.resultWorkflowHistory.create({
          data: {
            submissionId: submission.id,
            action: ResultWorkflowAction.RETURNED_TO_LECTURER,
            fromStatus: submission.status,
            toStatus: ResultWorkflowStatus.RETURNED_TO_LECTURER,
            performedById: authorization.user.id,
            comment,
          },
        });
      });
      revalidateResultPaths({
        courseId,
        allocationId: submission.assessment.lecturerAllocation.id,
        assessmentId: submission.assessment.id,
      });
      return {
        success: true,
        message: `${submission.assessment.code} results were returned to the lecturer for amendment.`,
      };
    }
    const isAcademicResubmission =
      submission.status === ResultWorkflowStatus.RETURNED_TO_COORDINATOR;
    await prisma.$transaction(async (transaction) => {
      await transaction.resultSubmission.update({
        where: { id: submission.id },
        data: {
          status: ResultWorkflowStatus.SUBMITTED_TO_ACADEMIC_DIRECTOR,
          coordinatorReviewedById: authorization.user.id,
          coordinatorReviewedAt: reviewedAt,
          coordinatorComment: comment || null,
          submittedToAcademicDirectorAt: reviewedAt,
          /* * Clear the previous Academic Director review fields * when resubmitting a returned result sheet. * The previous decision remains safely recorded in * ResultWorkflowHistory. */ academicReviewedById:
            null,
          academicReviewedAt: null,
          academicComment: null,
          finalApprovedAt: null,
        },
      });
      await transaction.resultWorkflowHistory.create({
        data: {
          submissionId: submission.id,
          action: isAcademicResubmission
            ? ResultWorkflowAction.RESUBMITTED_TO_ACADEMIC_DIRECTOR
            : ResultWorkflowAction.COORDINATOR_APPROVED_AND_FORWARDED,
          fromStatus: submission.status,
          toStatus: ResultWorkflowStatus.SUBMITTED_TO_ACADEMIC_DIRECTOR,
          performedById: authorization.user.id,
          comment:
            comment ||
            `${submission.assessment.code} results reviewed and forwarded to the Academic Director.`,
        },
      });
    });
    revalidateResultPaths({
      courseId,
      allocationId: submission.assessment.lecturerAllocation.id,
      assessmentId: submission.assessment.id,
    });
    return {
      success: true,
      message: isAcademicResubmission
        ? `${submission.assessment.code} results were resubmitted to the Academic Director.`
        : `${submission.assessment.code} results were approved and forwarded to the Academic Director.`,
    };
  } catch (error) {
    console.error("[reviewResultsByCoordinator]", error);
    return {
      error: "Failed to review the submitted results. Please try again.",
    };
  }
}
function revalidateResultPaths({
  courseId,
  allocationId,
  assessmentId,
}: {
  courseId: string;
  allocationId: string;
  assessmentId: string;
}) {
  revalidatePath("/coordinator/results-review");
  revalidatePath(`/coordinator/courses/${courseId}/lecturer-allocations`);
  revalidatePath(`/lecturer/allocations/${allocationId}/assessments`);
  revalidatePath(
    `/lecturer/allocations/${allocationId}/assessments/${assessmentId}`,
  );
  revalidatePath("/academic-director/results-review");
  revalidatePath("/lecturer/my-units");
}
function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
