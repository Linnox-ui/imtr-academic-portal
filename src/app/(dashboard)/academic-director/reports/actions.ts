"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function generatePerformanceCSV() {
  // 1. Security Check
  const session = await auth();
  const role = (session?.user?.role || "").toUpperCase();

  if (
    !session?.user?.id ||
    (role !== "ACADEMIC_DIRECTOR" && role !== "SUPER_ADMIN")
  ) {
    throw new Error("Unauthorized Access");
  }

  // 2. Fetch all published results
  const publishedSubmissions = await prisma.resultSubmission.findMany({
    where: { status: "PUBLISHED" },
    include: {
      assessment: {
        include: {
          unitAssignment: { include: { unit: true } },
          intake: { include: { course: true } },
        },
      },
      results: true,
    },
  });

  // 3. Aggregate Data
  const unitPerformance = new Map<
    string,
    {
      code: string;
      title: string;
      course: string;
      intake: string;
      total: number;
      passes: number;
    }
  >();

  publishedSubmissions.forEach((sub) => {
    const passThreshold = Number(sub.assessment.maxMarks) / 2;
    const key = sub.assessment.id;

    if (!unitPerformance.has(key)) {
      unitPerformance.set(key, {
        code: sub.assessment.unitAssignment.unit.code,
        title: sub.assessment.unitAssignment.unit.title,
        course: sub.assessment.intake.course.title,
        intake: sub.assessment.intake.title,
        total: 0,
        passes: 0,
      });
    }

    const data = unitPerformance.get(key)!;

    sub.results.forEach((result) => {
      if (!result.isAbsent && !result.isExempted && result.marks) {
        data.total++;
        if (Number(result.marks) >= passThreshold) {
          data.passes++;
        }
      }
    });
  });

  // 4. Build the CSV String
  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent +=
    "Unit Code,Unit Title,Course,Cohort / Intake,Total Assessed,Total Passes,Pass Rate (%)\n";

  Array.from(unitPerformance.values()).forEach((row) => {
    const passRate =
      row.total > 0 ? Math.round((row.passes / row.total) * 100) : 0;
    const safeTitle = `"${row.title.replace(/"/g, '""')}"`;
    const safeCourse = `"${row.course.replace(/"/g, '""')}"`;
    const safeIntake = `"${row.intake.replace(/"/g, '""')}"`;

    csvContent += `${row.code},${safeTitle},${safeCourse},${safeIntake},${row.total},${row.passes},${passRate}%\n`;
  });

  return csvContent;
}
