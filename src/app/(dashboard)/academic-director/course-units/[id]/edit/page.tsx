import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { EditCourseUnitForm } from "./edit-course-unit-form";

export const dynamic = "force-dynamic";

type EditCourseUnitPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCourseUnitPage({
  params,
}: EditCourseUnitPageProps) {
  const { id } = await params;

  const [unit, courses] =
    await Promise.all([
      prisma.courseUnit.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          isActive: true,
          courseId: true,
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

  if (!unit) {
    notFound();
  }

  const courseOptions = courses.map(
    (course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      category: String(course.category),
    }),
  );

  return (
    <EditCourseUnitForm
      unit={unit}
      courses={courseOptions}
    />
  );
}
