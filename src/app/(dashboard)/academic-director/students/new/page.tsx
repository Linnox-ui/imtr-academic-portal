import { prisma } from "@/lib/prisma";

import { NewStudentForm } from "./new-student-form";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  const [intakes, courses] = await Promise.all([
    prisma.intake.findMany({
      where: {
        status: {
          in: ["PLANNED", "OPEN", "ACTIVE"],
        },
      },
      orderBy: [
        {
          year: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        code: true,
        title: true,
        year: true,
        status: true,
        courseId: true,
        assessmentMode: true,
      },
    }),

    prisma.trainingCourse.findMany({
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        code: true,
        title: true,
        category: true,
      },
    }),
  ]);

  const courseMap = new Map(
    courses.map((course) => [course.id, course]),
  );

  const intakeOptions = intakes.map((intake) => {
    const course = courseMap.get(intake.courseId);

    return {
      id: intake.id,
      code: intake.code,
      title: intake.title,
      year: intake.year,
      status: intake.status,
      courseId: intake.courseId,
      courseCode: course?.code || intake.code,
      courseTitle: course?.title || "Course not found",
      courseCategory: course ? String(course.category) : "UNKNOWN",
      assessmentMode: String(intake.assessmentMode),
    };
  });

  return (
    <NewStudentForm intakeOptions={intakeOptions} />
  );
}
