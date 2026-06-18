"use server";
import { revalidatePath } from "next/cache";
import {
  LecturerAllocationRole,
  Prisma,
  ResultWorkflowAction,
  ResultWorkflowStatus,
  UnitAssignmentStatus,
} from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
type ResultEntryActionResult = {
  success?: boolean;
  message?: string;
  error?: string;
};
type DraftResultInput = {
  studentProfileId: string;
  marks: string;
  isAbsent: boolean;
  isExempted: boolean;
  remarks: string;
};
type ValidatedResultInput = {
  studentProfileId: string;
  marks: Prisma.Decimal | null;
  isAbsent: boolean;
  isExempted: boolean;
  remarks: string | null;
};
const EDITABLE_STATUSES: ResultWorkflowStatus[] = [
  ResultWorkflowStatus.DRAFT,
  ResultWorkflowStatus.RETURNED_TO_LECTURER,
];
function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
}
function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function decimalValuesMatch(
  first: Prisma.Decimal | null,
  second: Prisma.Decimal | null,
) {
  if (first === null && second === null) {
    return true;
  }
  if (first === null || second === null) {
    return false;
  }
  return first.equals(second);
}
export async function saveDraftResults(
  formData: FormData,
): Promise<ResultEntryActionResult> {
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();
  const resultsPayload = String(formData.get("results") ?? "").trim();
  if (!assessmentId) {
    return { error: "Missing assessment information." };
  }
  if (!resultsPayload) {
    return { error: "No student results were provided." };
  }
  let rawResults: DraftResultInput[];
  try {
    const parsed = JSON.parse(resultsPayload);
    if (!Array.isArray(parsed)) {
      return { error: "Invalid student result data." };
    }
    rawResults = parsed.map((result) => ({
      studentProfileId: normalizeText(result?.studentProfileId),
      marks: normalizeText(result?.marks),
      isAbsent: normalizeBoolean(result?.isAbsent),
      isExempted: normalizeBoolean(result?.isExempted),
      remarks: normalizeText(result?.remarks),
    }));
  } catch {
    return { error: "The student result data could not be read." };
  }
  if (rawResults.length === 0) {
    return { error: "No student results were provided." };
  }
  const duplicateStudentIds = rawResults
    .map((result) => result.studentProfileId)
    .filter(
      (studentId, index, allIds) =>
        studentId && allIds.indexOf(studentId) !== index,
    );
  if (duplicateStudentIds.length > 0) {
    return { error: "The submitted result sheet contains duplicate students." };
  }
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in." };
  }
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isActive: true, role: { select: { name: true } } },
    });
    if (
      !currentUser ||
      !currentUser.isActive ||
      currentUser.role.name !== "lecturer"
    ) {
      return {
        error: "Only an active lecturer account can enter student results.",
      };
    }
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        code: true,
        title: true,
        isActive: true,
        maxMarks: true,
        intakeId: true,
        unitAssignmentId: true,
        intake: { select: { id: true, code: true, courseId: true } },
        unitAssignment: {
          select: {
            id: true,
            status: true,
            unit: { select: { code: true, title: true, isActive: true } },
            semester: {
              select: {
                isActive: true,
                courseYear: { select: { isActive: true } },
              },
            },
          },
        },
        resultSubmission: { select: { id: true, status: true, version: true } },
      },
    });
    if (!assessment || !assessment.isActive) {
      return { error: "The selected assessment was not found or is inactive." };
    }
    if (
      assessment.unitAssignment.status !== UnitAssignmentStatus.APPROVED ||
      !assessment.unitAssignment.unit.isActive ||
      !assessment.unitAssignment.semester.isActive ||
      !assessment.unitAssignment.semester.courseYear.isActive
    ) {
      return {
        error:
          "Results cannot be entered because the unit or academic period is no longer active and approved.",
      };
    }
    if (!assessment.resultSubmission) {
      return {
        error: "The draft result submission for this assessment was not found.",
      };
    }
    if (!EDITABLE_STATUSES.includes(assessment.resultSubmission.status)) {
      return {
        error: `Results cannot be edited while the submission status is ${formatEnum(String(assessment.resultSubmission.status))}.`,
      };
    }
    const activePrimaryAllocation =
      await prisma.lecturerUnitAllocation.findFirst({
        where: {
          lecturerId: currentUser.id,
          intakeId: assessment.intakeId,
          unitAssignmentId: assessment.unitAssignmentId,
          allocationRole: LecturerAllocationRole.PRIMARY,
          isActive: true,
        },
        select: { id: true },
      });
    if (!activePrimaryAllocation) {
      return {
        error:
          "Only the active primary lecturer for this intake and unit can edit the official result sheet.",
      };
    }
    const studentProfileIds = rawResults.map(
      (result) => result.studentProfileId,
    );
    if (studentProfileIds.some((studentProfileId) => !studentProfileId)) {
      return {
        error: "One or more student records are missing an identifier.",
      };
    }
    const students = await prisma.studentProfile.findMany({
      where: { id: { in: studentProfileIds }, intakeId: assessment.intakeId },
      select: {
        id: true,
        admissionNumber: true,
        academicStatus: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    if (students.length !== rawResults.length) {
      return {
        error: "One or more students do not belong to the selected intake.",
      };
    }
    const studentMap = new Map(
      students.map((student) => [student.id, student]),
    );
    const maximumMarks = assessment.maxMarks;
    const validatedResults: ValidatedResultInput[] = [];
    for (const result of rawResults) {
      const student = studentMap.get(result.studentProfileId);
      if (!student) {
        return {
          error: "A student in the result sheet could not be verified.",
        };
      }
      if (result.isAbsent && result.isExempted) {
        return {
          error: `${student.admissionNumber} cannot be marked as both absent and exempted.`,
        };
      }
      let marks: Prisma.Decimal | null = null;
      if (result.isAbsent || result.isExempted) {
        marks = null;
      } else if (result.marks) {
        try {
          marks = new Prisma.Decimal(result.marks);
        } catch {
          return {
            error: `Enter a valid mark for ${student.admissionNumber}.`,
          };
        }
        if (marks.isNegative()) {
          return {
            error: `Marks for ${student.admissionNumber} cannot be negative.`,
          };
        }
        if (marks.greaterThan(maximumMarks)) {
          return {
            error: `Marks for ${student.admissionNumber} cannot exceed ${maximumMarks.toString()}.`,
          };
        }
      }
      validatedResults.push({
        studentProfileId: result.studentProfileId,
        marks,
        isAbsent: result.isAbsent,
        isExempted: result.isExempted,
        remarks: result.remarks || null,
      });
    }
    const existingResults = await prisma.studentAssessmentResult.findMany({
      where: {
        submissionId: assessment.resultSubmission.id,
        studentProfileId: { in: studentProfileIds },
      },
      select: {
        id: true,
        studentProfileId: true,
        marks: true,
        isAbsent: true,
        isExempted: true,
        remarks: true,
      },
    });
    const existingResultMap = new Map(
      existingResults.map((result) => [result.studentProfileId, result]),
    );
    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    await prisma.$transaction(async (transaction) => {
      for (const result of validatedResults) {
        const existing = existingResultMap.get(result.studentProfileId);
        if (!existing) {
          await transaction.studentAssessmentResult.create({
            data: {
              submissionId: assessment.resultSubmission!.id,
              studentProfileId: result.studentProfileId,
              marks: result.marks,
              isAbsent: result.isAbsent,
              isExempted: result.isExempted,
              remarks: result.remarks,
              enteredById: currentUser.id,
            },
          });
          createdCount += 1;
          continue;
        }
        const marksChanged = !decimalValuesMatch(existing.marks, result.marks);
        const absentChanged = existing.isAbsent !== result.isAbsent;
        const exemptedChanged = existing.isExempted !== result.isExempted;
        const remarksChanged = (existing.remarks ?? null) !== result.remarks;
        const hasChanged =
          marksChanged || absentChanged || exemptedChanged || remarksChanged;
        if (!hasChanged) {
          unchangedCount += 1;
          continue;
        }
        await transaction.studentResultChangeHistory.create({
          data: {
            studentResultId: existing.id,
            previousMarks: existing.marks,
            newMarks: result.marks,
            previousAbsent: existing.isAbsent,
            newAbsent: result.isAbsent,
            previousExempted: existing.isExempted,
            newExempted: result.isExempted,
            previousRemarks: existing.remarks,
            newRemarks: result.remarks,
            performedById: currentUser.id,
            reason:
              assessment.resultSubmission!.status ===
              ResultWorkflowStatus.RETURNED_TO_LECTURER
                ? "Result amended after coordinator review."
                : "Draft result updated by lecturer.",
          },
        });
        await transaction.studentAssessmentResult.update({
          where: { id: existing.id },
          data: {
            marks: result.marks,
            isAbsent: result.isAbsent,
            isExempted: result.isExempted,
            remarks: result.remarks,
            lastEditedById: currentUser.id,
          },
        });
        updatedCount += 1;
      }
      await transaction.resultWorkflowHistory.create({
        data: {
          submissionId: assessment.resultSubmission!.id,
          action: ResultWorkflowAction.DRAFT_SAVED,
          fromStatus: assessment.resultSubmission!.status,
          toStatus: assessment.resultSubmission!.status,
          performedById: currentUser.id,
          comment: `Draft saved: ${createdCount} created, ${updatedCount} updated, ${unchangedCount} unchanged.`,
        },
      });
    });
    revalidatePath(
      `/lecturer/allocations/${activePrimaryAllocation.id}/assessments`,
    );
    revalidatePath(
      `/lecturer/allocations/${activePrimaryAllocation.id}/assessments/${assessment.id}`,
    );
    revalidatePath("/lecturer/my-units");
    return {
      success: true,
      message: `Draft saved successfully. ${createdCount} result${createdCount === 1 ? "" : "s"} created and ${updatedCount} updated.`,
    };
  } catch (error) {
    console.error("[saveDraftResults]", error);
    return { error: "Failed to save the draft results. Please try again." };
  }
}

export async function submitResultsToCoordinator(
  formData: FormData,
): Promise<ResultEntryActionResult> {
  const assessmentId = String(formData.get("assessmentId") ?? "").trim();

  if (!assessmentId) {
    return {
      error: "Missing assessment information.",
    };
  }

  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "You must be signed in.",
    };
  }

  try {
    const currentUser = await prisma.user.findUnique({
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

    if (
      !currentUser ||
      !currentUser.isActive ||
      currentUser.role.name !== "lecturer"
    ) {
      return {
        error: "Only an active lecturer can submit results.",
      };
    }

    const assessment = await prisma.assessment.findUnique({
      where: {
        id: assessmentId,
      },
      select: {
        id: true,
        code: true,
        title: true,
        isActive: true,
        maxMarks: true,
        intakeId: true,
        unitAssignmentId: true,

        intake: {
          select: {
            id: true,
            code: true,

            _count: {
              select: {
                students: true,
              },
            },
          },
        },

        unitAssignment: {
          select: {
            status: true,

            unit: {
              select: {
                code: true,
                title: true,
                isActive: true,
              },
            },

            semester: {
              select: {
                isActive: true,

                courseYear: {
                  select: {
                    isActive: true,
                  },
                },
              },
            },
          },
        },

        resultSubmission: {
          select: {
            id: true,
            status: true,
            version: true,

            results: {
              select: {
                id: true,
                studentProfileId: true,
                marks: true,
                isAbsent: true,
                isExempted: true,
              },
            },
          },
        },
      },
    });

    if (!assessment || !assessment.isActive) {
      return {
        error: "The assessment was not found or is inactive.",
      };
    }

    if (!assessment.resultSubmission) {
      return {
        error: "The result submission record was not found.",
      };
    }

    if (
      assessment.unitAssignment.status !== UnitAssignmentStatus.APPROVED ||
      !assessment.unitAssignment.unit.isActive ||
      !assessment.unitAssignment.semester.isActive ||
      !assessment.unitAssignment.semester.courseYear.isActive
    ) {
      return {
        error:
          "Results cannot be submitted because the unit or academic period is no longer active and approved.",
      };
    }

    const currentStatus = assessment.resultSubmission.status;

    const canSubmit =
      currentStatus === ResultWorkflowStatus.DRAFT ||
      currentStatus === ResultWorkflowStatus.RETURNED_TO_LECTURER;

    if (!canSubmit) {
      return {
        error: `Results cannot be submitted while the status is ${formatEnum(
          String(currentStatus),
        )}.`,
      };
    }

    const activePrimaryAllocation =
      await prisma.lecturerUnitAllocation.findFirst({
        where: {
          lecturerId: currentUser.id,
          intakeId: assessment.intakeId,
          unitAssignmentId: assessment.unitAssignmentId,
          allocationRole: LecturerAllocationRole.PRIMARY,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

    if (!activePrimaryAllocation) {
      return {
        error:
          "Only the active primary lecturer can submit the official result sheet.",
      };
    }

    const expectedStudentCount = assessment.intake._count.students;

    if (expectedStudentCount === 0) {
      return {
        error: "This intake has no admitted students.",
      };
    }

    const results = assessment.resultSubmission.results;

    if (results.length !== expectedStudentCount) {
      return {
        error: `Complete the result sheet before submission. Results are available for ${results.length} of ${expectedStudentCount} students.`,
      };
    }

    const duplicateStudentIds = results
      .map((result) => result.studentProfileId)
      .filter(
        (studentId, index, allIds) => allIds.indexOf(studentId) !== index,
      );

    if (duplicateStudentIds.length > 0) {
      return {
        error: "The result sheet contains duplicate student records.",
      };
    }

    for (const result of results) {
      if (result.isAbsent && result.isExempted) {
        return {
          error: "A student cannot be marked as both absent and exempted.",
        };
      }

      if (result.marks !== null && (result.isAbsent || result.isExempted)) {
        return {
          error: "Absent or exempted students must not have marks entered.",
        };
      }

      if (result.marks === null && !result.isAbsent && !result.isExempted) {
        return {
          error:
            "Every student must have marks or be marked absent or exempted.",
        };
      }

      if (
        result.marks !== null &&
        (result.marks.isNegative() ||
          result.marks.greaterThan(assessment.maxMarks))
      ) {
        return {
          error: `All marks must be between 0 and ${assessment.maxMarks.toString()}.`,
        };
      }
    }

    const submittedAt = new Date();

    const isResubmission =
      currentStatus === ResultWorkflowStatus.RETURNED_TO_LECTURER;

    const nextVersion = isResubmission
      ? assessment.resultSubmission.version + 1
      : assessment.resultSubmission.version;

    await prisma.$transaction(async (transaction) => {
      await transaction.resultSubmission.update({
        where: {
          id: assessment.resultSubmission!.id,
        },
        data: {
          status: ResultWorkflowStatus.SUBMITTED_TO_COORDINATOR,

          version: nextVersion,

          submittedToCoordinatorAt: submittedAt,

          coordinatorReviewedById: null,
          coordinatorReviewedAt: null,
          coordinatorComment: null,
        },
      });

      await transaction.resultWorkflowHistory.create({
        data: {
          submissionId: assessment.resultSubmission!.id,

          action: isResubmission
            ? ResultWorkflowAction.RESUBMITTED_TO_COORDINATOR
            : ResultWorkflowAction.SUBMITTED_TO_COORDINATOR,

          fromStatus: currentStatus,

          toStatus: ResultWorkflowStatus.SUBMITTED_TO_COORDINATOR,

          performedById: currentUser.id,

          comment: isResubmission
            ? `${assessment.code} results amended and resubmitted to the Course Coordinator.`
            : `${assessment.code} results submitted to the Course Coordinator for review.`,
        },
      });
    });

    revalidatePath(
      `/lecturer/allocations/${activePrimaryAllocation.id}/assessments`,
    );

    revalidatePath(
      `/lecturer/allocations/${activePrimaryAllocation.id}/assessments/${assessment.id}`,
    );

    revalidatePath("/lecturer/my-units");
    revalidatePath("/coordinator/results-review");

    return {
      success: true,
      message: `${assessment.code} results for ${assessment.unitAssignment.unit.code} were submitted to the Course Coordinator successfully.`,
    };
  } catch (error) {
    console.error("[submitResultsToCoordinator]", error);

    return {
      error: "Failed to submit the results. Please try again.",
    };
  }
}

function formatEnum(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
