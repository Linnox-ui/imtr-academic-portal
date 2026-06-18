import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { EditCourseForm } from "./edit-course-form";

export const dynamic = "force-dynamic";

type EditCoursePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditCoursePage({
  params,
}: EditCoursePageProps) {
  const { id } = await params;

  const course =
    await prisma.trainingCourse.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        code: true,
        title: true,
        category: true,
        description: true,
      },
    });

  if (!course) {
    notFound();
  }

  return <EditCourseForm course={course} />;
}
