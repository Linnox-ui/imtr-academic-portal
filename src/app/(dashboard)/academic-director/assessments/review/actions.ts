"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function publishResults(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const submissionId = formData.get("submissionId") as string;
  if (!submissionId) throw new Error("Missing Submission ID");

  await prisma.resultSubmission.update({
    where: { id: submissionId },
    data: {
      status: "PUBLISHED",
      publishedById: session.user.id,
      publishedAt: new Date(),
    },
  });

  await prisma.resultWorkflowHistory.create({
    data: {
      submissionId,
      action: "PUBLISHED",
      toStatus: "PUBLISHED",
      performedById: session.user.id,
    },
  });

  revalidatePath("/academic-director/assessments");
  revalidatePath(`/academic-director/assessments/review`);
  redirect("/academic-director/assessments");
}

export async function rejectToCoordinator(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const submissionId = formData.get("submissionId") as string;
  if (!submissionId) throw new Error("Missing Submission ID");

  await prisma.resultSubmission.update({
    where: { id: submissionId },
    data: {
      status: "RETURNED_TO_COORDINATOR",
    },
  });

  await prisma.resultWorkflowHistory.create({
    data: {
      submissionId,
      action: "RETURNED_TO_COORDINATOR",
      toStatus: "RETURNED_TO_COORDINATOR",
      performedById: session.user.id,
    },
  });

  revalidatePath("/academic-director/assessments");
  revalidatePath(`/academic-director/assessments/review`);
  redirect("/academic-director/assessments");
}
