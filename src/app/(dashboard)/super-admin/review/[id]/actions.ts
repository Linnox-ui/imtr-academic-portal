"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Security Gate: Ensure only Super Admins can run these functions
async function verifySuperAdmin() {
  const session = await auth();
  if (session?.user?.role?.toUpperCase() !== "SUPER_ADMIN") {
    throw new Error("Unauthorized Override Attempt");
  }
}

export async function forcePublishAction(submissionId: string) {
  await verifySuperAdmin();

  await prisma.resultSubmission.update({
    where: { id: submissionId },
    data: { status: "PUBLISHED" },
  });

  // Refresh the detail page and the master list
  revalidatePath(`/super-admin/review/${submissionId}`);
  revalidatePath("/super-admin/review");
}

export async function revertToDraftAction(submissionId: string) {
  await verifySuperAdmin();

  await prisma.resultSubmission.update({
    where: { id: submissionId },
    data: { status: "DRAFT" },
  });

  revalidatePath(`/super-admin/review/${submissionId}`);
  revalidatePath("/super-admin/review");
}

export async function deleteSubmissionAction(submissionId: string) {
  await verifySuperAdmin();

  // 1. Delete all nested results through the parent relation
  // (This avoids needing to know the exact child table name!)
  await prisma.resultSubmission.update({
    where: { id: submissionId },
    data: {
      results: {
        deleteMany: {}, // Deletes all associated records safely
      },
    },
  });

  // 2. Now that the children are gone, safely delete the parent submission
  await prisma.resultSubmission.delete({
    where: { id: submissionId },
  });

  revalidatePath("/super-admin/review");
  redirect("/super-admin/review");
}
