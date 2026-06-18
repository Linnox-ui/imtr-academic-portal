import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { CourseStructureManager } from "./course-structure-manager";

export const dynamic = "force-dynamic";

type CourseStructurePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CourseStructurePage({
  params,
}: CourseStructurePageProps) {
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
        courseYears: {
          orderBy: {
            sequence: "asc",
          },
          select: {
            id: true,
            title: true,
            yearNumber: true,
            sequence: true,
            isActive: true,
            semesters: {
              orderBy: {
                sequence: "asc",
              },
              select: {
                id: true,
                title: true,
                semesterNumber: true,
                sequence: true,
                periodType: true,
                isActive: true,
                _count: {
                  select: {
                    unitAssignments: true,
                  },
                },
              },
            },
          },
        },
      },
    });

  if (!course) {
    notFound();
  }

  const structure = {
    id: course.id,
    code: course.code,
    title: course.title,
    category: String(course.category),
    years: course.courseYears.map(
      (year) => ({
        id: year.id,
        title: year.title,
        yearNumber: year.yearNumber,
        sequence: year.sequence,
        isActive: year.isActive,
        semesters: year.semesters.map(
          (semester) => ({
            id: semester.id,
            title: semester.title,
            semesterNumber:
              semester.semesterNumber,
            sequence: semester.sequence,
            periodType: String(
              semester.periodType,
            ),
            isActive: semester.isActive,
            unitCount:
              semester._count
                .unitAssignments,
          }),
        ),
      }),
    ),
  };

  return (
    <CourseStructureManager
      course={structure}
    />
  );
}
