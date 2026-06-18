"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireCoordinatorScope } from "@/lib/coordinator-scope";
import { prisma } from "@/lib/prisma";

type ActionResult = { error?: string; success?: boolean; message?: string };

function getText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

async function requireScopedSubmission(submissionId: string) {
  const scope = await requireCoordinatorScope();

  if (scope.isGlobal) {
    return { scope, submission: null };
  }

  const submission = await prisma.resultSubmission.findFirst({
    where: {
      id: submissionId,
      assessment: {
        intakeId: scope.intakeId!,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!submission) {
    redirect("/unauthorized");
  }

  return { scope, submission };
}

export async function forwardResultsToAcademicDirector(formData: FormData): Promise<ActionResult> {
  const submissionId = getText(formData, "submissionId");
  const comment = getText(formData, "comment") || "Forwarded for Academic Director review.";

  const { scope, submission } = await requireScopedSubmission(submissionId);

  if (scope.isGlobal || !submission) {
    return { error: "Coordinator scope is required." };
  }

  if (submission.status !== "SUBMITTED_TO_COORDINATOR" && submission.status !== "RETURNED_TO_COORDINATOR") {
    return { error: "Only submitted or returned result sheets can be forwarded." };
  }

  const action =
    submission.status === "RETURNED_TO_COORDINATOR"
      ? "RESUBMITTED_TO_ACADEMIC_DIRECTOR"
      : "COORDINATOR_APPROVED_AND_FORWARDED";

  await prisma.resultSubmission.update({
    where: { id: submission.id },
    data: {
      status: "SUBMITTED_TO_ACADEMIC_DIRECTOR",
      coordinatorReviewedById: scope.user.id,
      coordinatorReviewedAt: new Date(),
      coordinatorComment: comment,
      submittedToAcademicDirectorAt: new Date(),
      workflowHistory: {
        create: {
          action: action as any,
          fromStatus: submission.status,
          toStatus: "SUBMITTED_TO_ACADEMIC_DIRECTOR",
          performedById: scope.user.id,
          comment,
        },
      },
    },
  });

  revalidatePath("/coordinator/results");
  return { success: true, message: "Results forwarded to Academic Director." };
}

export async function returnResultsToLecturer(formData: FormData): Promise<ActionResult> {
  const submissionId = getText(formData, "submissionId");
  const comment = getText(formData, "comment");

  if (!comment) {
    return { error: "Write a return comment for the lecturer." };
  }

  const { scope, submission } = await requireScopedSubmission(submissionId);

  if (scope.isGlobal || !submission) {
    return { error: "Coordinator scope is required." };
  }

  if (submission.status !== "SUBMITTED_TO_COORDINATOR") {
    return { error: "Only submissions awaiting coordinator review can be returned." };
  }

  await prisma.resultSubmission.update({
    where: { id: submission.id },
    data: {
      status: "RETURNED_TO_LECTURER",
      coordinatorReviewedById: scope.user.id,
      coordinatorReviewedAt: new Date(),
      coordinatorComment: comment,
      workflowHistory: {
        create: {
          action: "RETURNED_TO_LECTURER",
          fromStatus: submission.status,
          toStatus: "RETURNED_TO_LECTURER",
          performedById: scope.user.id,
          comment,
        },
      },
    },
  });

  revalidatePath("/coordinator/results");
  return { success: true, message: "Results returned to lecturer." };
}
