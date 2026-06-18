"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function createIntake(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "You must be signed in to create an intake.",
    };
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      isActive: true,
      accountStatus: true,
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
    currentUser.accountStatus !== "ACTIVE" ||
    !["academic_director", "super_admin"].includes(currentUser.role.name)
  ) {
    return {
      error: "You are not allowed to create an intake.",
    };
  }

  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase();

  const title = String(formData.get("title") || "").trim();
  const year = Number(formData.get("year"));
  const assessmentMode = String(formData.get("assessmentMode") || "").trim();
  const status = String(formData.get("status") || "PLANNED").trim();
  const courseId = String(formData.get("courseId") || "").trim();
  const coordinatorId = String(formData.get("coordinatorId") || "").trim();

  if (
    !code ||
    !title ||
    !year ||
    !assessmentMode ||
    !status ||
    !courseId ||
    !coordinatorId
  ) {
    return {
      error: "Please fill in all required fields.",
    };
  }

  try {
    const existingIntake = await prisma.intake.findFirst({
      where: {
        code,
      },
    });

    if (existingIntake) {
      return {
        error: "An intake with this code already exists.",
      };
    }

    const course = await prisma.trainingCourse.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      return {
        error: "Selected course was not found.",
      };
    }

    const coordinator = await prisma.user.findFirst({
      where: {
        id: coordinatorId,
        isActive: true,
        accountStatus: "ACTIVE",
        role: {
          name: "lecturer",
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!coordinator) {
      return {
        error: "Selected coordinator must be an active lecturer.",
      };
    }

    const activeCoordinatorAssignment =
      await prisma.intakeCoordinatorAssignment.findFirst({
        where: {
          coordinatorId,
          isActive: true,
        },
        include: {
          intake: {
            select: {
              code: true,
            },
          },
        },
      });

    if (activeCoordinatorAssignment) {
      return {
        error: `This lecturer is already coordinating ${activeCoordinatorAssignment.intake.code}. End that assignment before assigning another intake.`,
      };
    }

    const intake = await prisma.$transaction(async (tx) => {
      const createdIntake = await tx.intake.create({
        data: {
          code,
          title,
          year,
          assessmentMode: assessmentMode as any,
          status,
          courseId,
        } as any,
      });

      await tx.intakeCoordinatorAssignment.create({
        data: {
          intakeId: createdIntake.id,
          coordinatorId,
          assignedById: currentUser.id,
        },
      });

      return createdIntake;
    });

    revalidatePath("/academic-director/intakes");
    revalidatePath("/academic-director/courses");
    revalidatePath(`/academic-director/courses/${courseId}`);
    revalidatePath("/coordinator");

    return {
      success: true,
      intakeId: intake.id,
      message: "Intake created and coordinator assigned successfully.",
    };
  } catch (error) {
    return {
      error: "Failed to create intake. Please check the details and try again.",
    };
  }
}

export async function updateIntake(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const code = String(formData.get("code") || "")
    .trim()
    .toUpperCase();
  const title = String(formData.get("title") || "").trim();
  const year = Number(formData.get("year"));
  const assessmentMode = String(formData.get("assessmentMode") || "").trim();
  const status = String(formData.get("status") || "").trim();
  const courseId = String(formData.get("courseId") || "").trim();

  if (!id) {
    return {
      error: "Missing intake ID.",
    };
  }

  if (!code || !title || !year || !assessmentMode || !status || !courseId) {
    return {
      error: "Please fill in all required fields.",
    };
  }

  try {
    const existingIntake = await prisma.intake.findFirst({
      where: {
        code,
        NOT: {
          id,
        },
      },
    });

    if (existingIntake) {
      return {
        error: "Another intake with this code already exists.",
      };
    }

    const course = await prisma.trainingCourse.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      return {
        error: "Selected course was not found.",
      };
    }

    const intake = await prisma.intake.update({
      where: {
        id,
      },
      data: {
        code,
        title,
        year,
        assessmentMode: assessmentMode as any,
        status,
        courseId,
      } as any,
    });

    revalidatePath("/academic-director/intakes");
    revalidatePath(`/academic-director/intakes/${id}`);
    revalidatePath(`/academic-director/intakes/${id}/edit`);
    revalidatePath("/academic-director/courses");
    revalidatePath(`/academic-director/courses/${courseId}`);

    return {
      success: true,
      intakeId: intake.id,
      message: "Intake updated successfully.",
    };
  } catch (error) {
    return {
      error: "Failed to update intake. Please check the details and try again.",
    };
  }
}
