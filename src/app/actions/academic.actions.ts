"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { auth } from "../../lib/auth";
import type { CourseCategory, AssessmentMode } from "@prisma/client";

// ------------------------------------------------------------------
// 1. CREATE TRAINING COURSE
// ------------------------------------------------------------------
export async function createTrainingCourse(data: {
  code: string;
  title: string;
  category: CourseCategory;
  description?: string;
}) {
  try {
    const session = await auth();
    // Only Academic Director or Super Admin can create courses
    if (
      !session?.user ||
      (session.user.role !== "academic_director" &&
        session.user.role !== "super_admin")
    ) {
      throw new Error("Unauthorized");
    }

    const course = await prisma.trainingCourse.create({
      data,
    });

    revalidatePath("/academic-director/courses");
    return { success: true, data: course };
  } catch (error: any) {
    console.error("[Action Error] createTrainingCourse:", error);
    // Handle unique constraint violations gracefully
    if (error.code === "P2002")
      return { error: "A course with this code already exists." };
    return { error: "Failed to create training course." };
  }
}

// ------------------------------------------------------------------
// 2. CREATE COURSE INTAKE
// ------------------------------------------------------------------
export async function createIntake(data: {
  code: string;
  title: string;
  year: number;
  assessmentMode: AssessmentMode;
  courseId: string;
}) {
  try {
    const session = await auth();
    if (
      !session?.user ||
      (session.user.role !== "academic_director" &&
        session.user.role !== "super_admin")
    ) {
      throw new Error("Unauthorized");
    }

    const intake = await prisma.intake.create({
      // sequenceCounter is automatically 0 by default, ready for the first student
      data: {
        ...data,
        status: "UPCOMING",
      },
    });

    revalidatePath("/academic-director/courses");
    return { success: true, data: intake };
  } catch (error: any) {
    console.error("[Action Error] createIntake:", error);
    if (error.code === "P2002")
      return { error: "An intake with this code already exists." };
    return { error: "Failed to create intake." };
  }
}
