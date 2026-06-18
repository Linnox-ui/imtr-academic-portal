import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { EditIntakeForm } from "./edit-intake-form";

export const dynamic = "force-dynamic";

type EditIntakePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditIntakePage({
  params,
}: EditIntakePageProps) {
  const { id } = await params;

  const [intake, courses] =
    await Promise.all([
      prisma.intake.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          code: true,
          title: true,
          year: true,
          assessmentMode: true,
          status: true,
          courseId: true,
          sequenceCounter: true,
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

  if (!intake) {
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
    <EditIntakeForm
      intake={{
        id: intake.id,
        code: intake.code,
        title: intake.title,
        year: intake.year,
        assessmentMode: String(
          intake.assessmentMode,
        ),
        status: String(intake.status),
        courseId: intake.courseId,
        sequenceCounter:
          intake.sequenceCounter,
      }}
      courses={courseOptions}
    />
  );
}
