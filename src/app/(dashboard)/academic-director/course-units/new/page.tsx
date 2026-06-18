import { prisma } from "@/lib/prisma";

import { NewCourseUnitForm } from "./new-course-unit-form";

export const dynamic = "force-dynamic";

export default async function NewCourseUnitPage() {
  const courses =
    await prisma.trainingCourse.findMany({
      orderBy: {
        title: "asc",
      },
      select: {
        id: true,
        code: true,
        title: true,
        category: true,
      },
    });

  const courseOptions = courses.map(
    (course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      category: String(course.category),
    }),
  );

  return (
    <NewCourseUnitForm
      courses={courseOptions}
    />
  );
}
