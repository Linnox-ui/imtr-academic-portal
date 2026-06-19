"use server";
import { revalidatePath } from "next/cache";
import {
  ResultWorkflowAction,
  ResultWorkflowStatus,
  UnitAssignmentStatus,
} from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
type AcademicReviewDecision = "APPROVE_AND_PUBLISH" | "RETURN_TO_COORDINATOR";
type AcademicReviewResult = {
  success?: boolean;
  message?: string;
  error?: string;
};
const ACADEMIC_REVIEW_ROLES = ["academic_director", "super_admin"];
async function getAuthorizedAcademicReviewer() {
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
    return { user: null, error: "Your account was not found or is inactive." };
  }
  if (!ACADEMIC_REVIEW_ROLES.includes(user.role.name)) {
    return {
      user: null,
      error:
        "Only the Academic Director or Super Admin can make the final result decision.",
    };
  }
  return { user, error: null };
}
export async function reviewResultsByAcademicDirector(
  formData: FormData,
): Promise<AcademicReviewResult> {
  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const decisionValue = String(formData.get("decision") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();
  if (!submissionId) {
    return { error: "Missing result submission information." };
  }
  const validDecisions: AcademicReviewDecision[] = [
    "APPROVE_AND_PUBLISH",
    "RETURN_TO_COORDINATOR",
  ];
  if (!validDecisions.includes(decisionValue as AcademicReviewDecision)) {
    return { error: "Invalid Academic Director review decision." };
  }
  const decision = decisionValue as AcademicReviewDecision;
  if (decision === "RETURN_TO_COORDINATOR" && !comment) {
    return {
      error:
        "Explain the corrections required before returning the results to the Course Coordinator.",
    };
  }
  const authorization = await getAuthorizedAcademicReviewer();
  if (!authorization.user) {
    return {
      error:
        authorization.error ||
        "You are not authorized to review these results.",
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
            isActive: true,
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
                status: true,
                unit: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
                    courseId: true,
                    isActive: true,
                  },
                },
                semester: {
                  select: {
                    id: true,
                    title: true,
                    isActive: true,
                    courseYear: {
                      select: {
                        id: true,
                        title: true,
                        courseId: true,
                        isActive: true,
                      },
                    },
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
    if (
      submission.status !== ResultWorkflowStatus.SUBMITTED_TO_ACADEMIC_DIRECTOR
    ) {
      return {
        error: `This result sheet cannot be reviewed while its status is ${formatEnum(String(submission.status))}.`,
      };
    }
    if (!submission.assessment.isActive) {
      return { error: "The assessment is no longer active." };
    }
    if (
      submission.assessment.unitAssignment.status !==
        UnitAssignmentStatus.APPROVED ||
      !submission.assessment.unitAssignment.unit.isActive ||
      !submission.assessment.unitAssignment.semester.isActive ||
      !submission.assessment.unitAssignment.semester.courseYear.isActive
    ) {
      return {
        error: "The unit or academic period is no longer active and approved.",
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
    /* * The Academic Director may return an incomplete or incorrect * sheet to the coordinator. * * Final approval requires a complete and valid result sheet. */ if (
      decision === "APPROVE_AND_PUBLISH"
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
        const profile = result.studentProfile;
        if (!profile) continue;
        const admissionNumber = result.studentProfile!.admissionNumber;
        if (profile.intakeId !== submission.assessment.intake.id) {
          return {
            error: `${admissionNumber} does not belong to the selected intake.`,
          };
        }
        if (result.isAbsent && result.isExempted) {
          return {
            error: `${admissionNumber} cannot be both absent and exempted.`,
          };
        }
        if (result.marks !== null && (result.isAbsent || result.isExempted)) {
          return {
            error: `${admissionNumber} has marks despite being absent or exempted.`,
          };
        }
        if (result.marks === null && !result.isAbsent && !result.isExempted) {
          return {
            error: `${admissionNumber} has no marks, absence or exemption recorded.`,
          };
        }
        if (
          result.marks !== null &&
          (result.marks.isNegative() ||
            result.marks.greaterThan(submission.assessment.maxMarks))
        ) {
          return {
            error: `${admissionNumber} has marks outside the permitted range.`,
          };
        }
      }
    }
    const reviewedAt = new Date();
    if (decision === "RETURN_TO_COORDINATOR") {
      await prisma.$transaction(async (transaction) => {
        await transaction.resultSubmission.update({
          where: { id: submission.id },
          data: {
            status: ResultWorkflowStatus.RETURNED_TO_COORDINATOR,
            academicReviewedById: authorization.user.id,
            academicReviewedAt: reviewedAt,
            academicComment: comment,
            finalApprovedAt: null,
            publishedById: null,
            publishedAt: null,
          },
        });
        await transaction.resultWorkflowHistory.create({
          data: {
            submissionId: submission.id,
            action: ResultWorkflowAction.RETURNED_TO_COORDINATOR,
            fromStatus: submission.status,
            toStatus: ResultWorkflowStatus.RETURNED_TO_COORDINATOR,
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
        message: `${submission.assessment.code} results were returned to the Course Coordinator for correction.`,
      };
    }
    /* * Approval and publication occur in one transaction. * * Two workflow-history entries are created so the audit trail * still records final approval and publication separately. */ await prisma.$transaction(
      async (transaction) => {
        await transaction.resultSubmission.update({
          where: { id: submission.id },
          data: {
            status: ResultWorkflowStatus.PUBLISHED,
            academicReviewedById: authorization.user.id,
            academicReviewedAt: reviewedAt,
            academicComment: comment || null,
            finalApprovedAt: reviewedAt,
            publishedById: authorization.user.id,
            publishedAt: reviewedAt,
          },
        });
        await transaction.resultWorkflowHistory.create({
          data: {
            submissionId: submission.id,
            action: ResultWorkflowAction.FINAL_APPROVED,
            fromStatus: submission.status,
            toStatus: ResultWorkflowStatus.FINAL_APPROVED,
            performedById: authorization.user.id,
            comment:
              comment ||
              `${submission.assessment.code} results received final academic approval.`,
          },
        });
        await transaction.resultWorkflowHistory.create({
          data: {
            submissionId: submission.id,
            action: ResultWorkflowAction.PUBLISHED,
            fromStatus: ResultWorkflowStatus.FINAL_APPROVED,
            toStatus: ResultWorkflowStatus.PUBLISHED,
            performedById: authorization.user.id,
            comment: `${submission.assessment.code} results published to students.`,
          },
        });
      },
    );
    revalidateResultPaths({
      courseId,
      allocationId: submission.assessment.lecturerAllocation.id,
      assessmentId: submission.assessment.id,
    });
    return {
      success: true,
      message: `${submission.assessment.code} results for ${submission.assessment.unitAssignment.unit.code} were approved and published to students successfully.`,
    };
  } catch (error) {
    console.error("[reviewResultsByAcademicDirector]", error);
    return {
      error: "Failed to complete the final result review. Please try again.",
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
  revalidatePath("/academic-director/results-review");
  revalidatePath("/coordinator/results-review");
  revalidatePath(`/coordinator/courses/${courseId}/lecturer-allocations`);
  revalidatePath(`/lecturer/allocations/${allocationId}/assessments`);
  revalidatePath(
    `/lecturer/allocations/${allocationId}/assessments/${assessmentId}`,
  );
  revalidatePath("/lecturer/my-units");
  revalidatePath("/student/results");
}
function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
