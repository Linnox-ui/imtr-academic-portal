import { prisma } from "@/lib/prisma";

import { NewIntakeForm } from "./new-intake-form";

export const dynamic = "force-dynamic";

export default async function NewIntakePage() {
  const [courses, lecturers] = await Promise.all([
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

    prisma.user.findMany({
      where: {
        isActive: true,
        accountStatus: "ACTIVE",
        role: {
          name: "lecturer",
        },
      },
      orderBy: [
        {
          firstName: "asc",
        },
        {
          lastName: "asc",
        },
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    }),
  ]);

  const courseOptions = courses.map((course) => ({
    id: course.id,
    code: course.code,
    title: course.title,
    category: String(course.category),
  }));

  const lecturerOptions = lecturers.map((lecturer) => {
    const name = [lecturer.firstName, lecturer.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      id: lecturer.id,
      name: name || lecturer.email,
      email: lecturer.email,
    };
  });

  return <NewIntakeForm courses={courseOptions} lecturers={lecturerOptions} />;
}
