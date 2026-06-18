"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ActionResult = {
  success?: boolean;
  error?: string;
  message?: string;
};

async function requireLecturer() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      accountStatus: true,
      role: { select: { name: true } },
    },
  });

  if (
    !user ||
    !user.isActive ||
    user.accountStatus !== "ACTIVE" ||
    user.role.name !== "lecturer"
  ) {
    redirect("/unauthorized");
  }

  return user;
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function getNumber(formData: FormData, key: string) {
  const raw = getText(formData, key);
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function resultPath(allocationId?: string, submissionId?: string) {
  const params = new URLSearchParams();

  if (allocationId) params.set("allocationId", allocationId);
  if (submissionId) params.set("submissionId", submissionId);

  return `/lecturer/results${params.toString() ? `?${params.toString()}` : ""}`;
}

export async function createAssessment(formData: FormData): Promise<ActionResult> {
  const lecturer = await requireLecturer();

  const allocationId = getText(formData, "allocationId");
  const code = getText(formData, "code").toUpperCase();
  const title = getText(formData, "title");
  const type = getText(formData, "type");
  const maxMarks = getNumber(formData, "maxMarks");
  const weightPercent = getNumber(formData, "weightPercent");
  const assessmentDate = getText(formData, "assessmentDate");

  if (!allocationId || !code || !title || !type || !maxMarks || maxMarks <= 0) {
    return { error: "Fill assessment code, title, type and valid max marks." };
  }

  const allocation = await prisma.lecturerUnitAllocation.findFirst({
    where: {
      id: allocationId,
      lecturerId: lecturer.id,
      isActive: true,
      unitAssignment: {
        status: "APPROVED",
      },
    },
    select: {
      id: true,
      intakeId: true,
      unitAssignmentId: true,
      intake: { select: { assessmentMode: true } },
    },
  });

  if (!allocation) {
    return { error: "You can only create assessments for your active allocated units." };
  }

  if (allocation.intake.assessmentMode === "NO_EXAM" && type === "FINAL_EXAM") {
    return { error: "This intake is marked as no-exam. Final exam assessment is not allowed." };
  }

  const existing = await prisma.assessment.findFirst({
    where: {
      intakeId: allocation.intakeId,
      unitAssignmentId: allocation.unitAssignmentId,
      code,
    },
    select: { id: true },
  });

  if (existing) {
    return { error: "An assessment with this code already exists for this unit and intake." };
  }

  const students = await prisma.student.findMany({
    where: {
      intakeId: allocation.intakeId,
      status: "ACTIVE",
    },
    select: { id: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  const submission = await prisma.$transaction(async (tx) => {
    const assessment = await tx.assessment.create({
      data: {
        code,
        title,
        type: type as any,
        maxMarks: String(maxMarks),
        weightPercent: weightPercent === null ? null : String(weightPercent),
        assessmentDate: assessmentDate ? new Date(`${assessmentDate}T00:00:00`) : null,
        intakeId: allocation.intakeId,
        unitAssignmentId: allocation.unitAssignmentId,
        lecturerAllocationId: allocation.id,
        createdById: lecturer.id,
      },
    });

    const resultSubmission = await tx.resultSubmission.create({
      data: {
        assessmentId: assessment.id,
        createdById: lecturer.id,
        status: "DRAFT",
        workflowHistory: {
          create: {
            action: "CREATED",
            toStatus: "DRAFT",
            performedById: lecturer.id,
            comment: "Assessment draft created by lecturer.",
          },
        },
      },
    });

    if (students.length > 0) {
      await tx.studentAssessmentResult.createMany({
        data: students.map((student) => ({
          submissionId: resultSubmission.id,
          studentId: student.id,
          marks: null,
          isAbsent: false,
          isExempted: false,
          enteredById: lecturer.id,
        })),
        skipDuplicates: true,
      });
    }

    return resultSubmission;
  });

  revalidatePath("/lecturer/results");
  redirect(resultPath(allocation.id, submission.id));
}

export async function saveDraftResults(formData: FormData): Promise<ActionResult> {
  const lecturer = await requireLecturer();
  const submissionId = getText(formData, "submissionId");
  const reason = getText(formData, "reason") || "Draft saved.";

  const submission = await prisma.resultSubmission.findFirst({
    where: {
      id: submissionId,
      assessment: {
        lecturerAllocation: {
          lecturerId: lecturer.id,
          isActive: true,
        },
      },
      status: {
        in: ["DRAFT", "RETURNED_TO_LECTURER"],
      },
    },
    select: {
      id: true,
      status: true,
      assessment: {
        select: {
          maxMarks: true,
          lecturerAllocationId: true,
          intakeId: true,
        },
      },
    },
  });

  if (!submission) {
    return { error: "This result sheet cannot be edited." };
  }

  const students = await prisma.student.findMany({
    where: {
      intakeId: submission.assessment.intakeId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const maxMarks = Number(submission.assessment.maxMarks);

  await prisma.$transaction(async (tx) => {
    for (const student of students) {
      const status = getText(formData, `status_${student.id}`) || "MARKED";
      const rawMarks = getText(formData, `marks_${student.id}`);
      const remarks = getText(formData, `remarks_${student.id}`);
      const isAbsent = status === "ABSENT";
      const isExempted = status === "EXEMPTED";
      const marks = isAbsent || isExempted || rawMarks === "" ? null : Number(rawMarks);

      if (marks !== null && (!Number.isFinite(marks) || marks < 0 || marks > maxMarks)) {
        throw new Error(`Invalid marks entered. Marks must be between 0 and ${maxMarks}.`);
      }

      const existing = await tx.studentAssessmentResult.findFirst({
        where: {
          submissionId: submission.id,
          studentId: student.id,
        },
        select: {
          id: true,
          marks: true,
          isAbsent: true,
          isExempted: true,
          remarks: true,
        },
      });

      if (existing) {
        const previousMarks = existing.marks === null ? null : String(existing.marks);
        const newMarks = marks === null ? null : String(marks);

        await tx.studentAssessmentResult.update({
          where: { id: existing.id },
          data: {
            marks: newMarks,
            isAbsent,
            isExempted,
            remarks: remarks || null,
            lastEditedById: lecturer.id,
            changes: {
              create: {
                previousMarks,
                newMarks,
                previousAbsent: existing.isAbsent,
                newAbsent: isAbsent,
                previousExempted: existing.isExempted,
                newExempted: isExempted,
                previousRemarks: existing.remarks,
                newRemarks: remarks || null,
                performedById: lecturer.id,
                reason,
              },
            },
          },
        });
      } else {
        await tx.studentAssessmentResult.create({
          data: {
            submissionId: submission.id,
            studentId: student.id,
            marks: marks === null ? null : String(marks),
            isAbsent,
            isExempted,
            remarks: remarks || null,
            enteredById: lecturer.id,
          },
        });
      }
    }

    await tx.resultSubmission.update({
      where: { id: submission.id },
      data: {
        workflowHistory: {
          create: {
            action: "DRAFT_SAVED",
            fromStatus: submission.status,
            toStatus: submission.status,
            performedById: lecturer.id,
            comment: reason,
          },
        },
      },
    });
  });

  revalidatePath("/lecturer/results");
  return { success: true, message: "Draft results saved." };
}

export async function submitResultsToCoordinator(formData: FormData): Promise<ActionResult> {
  const lecturer = await requireLecturer();
  const submissionId = getText(formData, "submissionId");
  const comment = getText(formData, "comment") || "Submitted to coordinator.";

  const submission = await prisma.resultSubmission.findFirst({
    where: {
      id: submissionId,
      assessment: {
        lecturerAllocation: {
          lecturerId: lecturer.id,
          isActive: true,
        },
      },
      status: {
        in: ["DRAFT", "RETURNED_TO_LECTURER"],
      },
    },
    select: {
      id: true,
      status: true,
      assessment: {
        select: {
          lecturerAllocationId: true,
        },
      },
    },
  });

  if (!submission) {
    return { error: "This result sheet cannot be submitted." };
  }

  const hasResults = await prisma.studentAssessmentResult.count({
    where: { submissionId: submission.id },
  });

  if (hasResults === 0) {
    return { error: "No student results have been saved for this assessment." };
  }

  const action =
    submission.status === "RETURNED_TO_LECTURER"
      ? "RESUBMITTED_TO_COORDINATOR"
      : "SUBMITTED_TO_COORDINATOR";

  await prisma.resultSubmission.update({
    where: { id: submission.id },
    data: {
      status: "SUBMITTED_TO_COORDINATOR",
      submittedToCoordinatorAt: new Date(),
      workflowHistory: {
        create: {
          action: action as any,
          fromStatus: submission.status,
          toStatus: "SUBMITTED_TO_COORDINATOR",
          performedById: lecturer.id,
          comment,
        },
      },
    },
  });

  revalidatePath("/lecturer/results");
  redirect(resultPath(submission.assessment.lecturerAllocationId, submission.id));
}
