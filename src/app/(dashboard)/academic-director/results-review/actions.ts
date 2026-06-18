"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ActionResult = { error?: string; success?: boolean; message?: string };

async function requireAcademicReviewer() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      isActive: true,
      accountStatus: true,
      role: { select: { name: true } },
    },
  });

  if (
    !user ||
    !user.isActive ||
    user.accountStatus !== "ACTIVE" ||
    !["academic_director", "super_admin"].includes(user.role.name)
  ) {
    redirect("/unauthorized");
  }

  return user;
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function finalApproveResults(formData: FormData): Promise<ActionResult> {
  const user = await requireAcademicReviewer();
  const submissionId = getText(formData, "submissionId");
  const comment = getText(formData, "comment") || "Final approved by Academic Director.";

  const submission = await prisma.resultSubmission.findFirst({
    where: {
      id: submissionId,
      status: "SUBMITTED_TO_ACADEMIC_DIRECTOR",
    },
    select: { id: true, status: true },
  });

  if (!submission) {
    return { error: "Only submissions awaiting Academic Director review can be approved." };
  }

  await prisma.resultSubmission.update({
    where: { id: submission.id },
    data: {
      status: "FINAL_APPROVED",
      academicReviewedById: user.id,
      academicReviewedAt: new Date(),
      academicComment: comment,
      finalApprovedAt: new Date(),
      workflowHistory: {
        create: {
          action: "FINAL_APPROVED",
          fromStatus: submission.status,
          toStatus: "FINAL_APPROVED",
          performedById: user.id,
          comment,
        },
      },
    },
  });

  revalidatePath("/academic-director/results-review");
  return { success: true, message: "Results final approved." };
}

export async function publishResults(formData: FormData): Promise<ActionResult> {
  const user = await requireAcademicReviewer();
  const submissionId = getText(formData, "submissionId");
  const comment = getText(formData, "comment") || "Published to permitted student view.";

  const submission = await prisma.resultSubmission.findFirst({
    where: {
      id: submissionId,
      status: "FINAL_APPROVED",
    },
    select: {
      id: true,
      status: true,
      assessment: {
        select: {
          type: true,
        },
      },
    },
  });

  if (!submission) {
    return { error: "Only final approved results can be published." };
  }

  // Current IMTR student portal rule: students only see CAT 1 and CAT 2.
  // FINAL_EXAM remains hidden until a separate final release/graduation workflow exists.
  if (!["CAT_1", "CAT_2"].includes(String(submission.assessment.type))) {
    return {
      error: "Only CAT 1 and CAT 2 can be published to students in the current workflow.",
    };
  }

  await prisma.resultSubmission.update({
    where: { id: submission.id },
    data: {
      status: "PUBLISHED",
      publishedById: user.id,
      publishedAt: new Date(),
      workflowHistory: {
        create: {
          action: "PUBLISHED",
          fromStatus: submission.status,
          toStatus: "PUBLISHED",
          performedById: user.id,
          comment,
        },
      },
    },
  });

  revalidatePath("/academic-director/results-review");
  revalidatePath("/student/results");
  return { success: true, message: "Results published to student portal." };
}

export async function returnResultsToCoordinator(formData: FormData): Promise<ActionResult> {
  const user = await requireAcademicReviewer();
  const submissionId = getText(formData, "submissionId");
  const comment = getText(formData, "comment");

  if (!comment) {
    return { error: "Write a return comment for the coordinator." };
  }

  const submission = await prisma.resultSubmission.findFirst({
    where: {
      id: submissionId,
      status: "SUBMITTED_TO_ACADEMIC_DIRECTOR",
    },
    select: { id: true, status: true },
  });

  if (!submission) {
    return { error: "Only submissions awaiting Academic Director review can be returned." };
  }

  await prisma.resultSubmission.update({
    where: { id: submission.id },
    data: {
      status: "RETURNED_TO_COORDINATOR",
      academicReviewedById: user.id,
      academicReviewedAt: new Date(),
      academicComment: comment,
      workflowHistory: {
        create: {
          action: "RETURNED_TO_COORDINATOR",
          fromStatus: submission.status,
          toStatus: "RETURNED_TO_COORDINATOR",
          performedById: user.id,
          comment,
        },
      },
    },
  });

  revalidatePath("/academic-director/results-review");
  return { success: true, message: "Results returned to coordinator." };
}
