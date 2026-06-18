import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { EditStudentForm } from "./edit-student-form";

export const dynamic = "force-dynamic";

type EditStudentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditStudentPage({
  params,
}: EditStudentPageProps) {
  const { id } = await params;

  const [student, intakes, courses] =
    await Promise.all([
      prisma.student.findUnique({
        where: {
          id,
        },
      }),

      prisma.intake.findMany({
        where: {
          status: {
            in: [
              "PLANNED",
              "OPEN",
              "ACTIVE",
              "COMPLETED",
            ],
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

  if (!student) {
    notFound();
  }

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

  const studentRecord = {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    admissionNumber: student.admissionNumber,
    nationalId: student.nationalId || "",
    gender: String(student.gender),
    dateOfBirth: formatDateForInput(
      student.dateOfBirth,
    ),
    email: student.email || "",
    phone: student.phone || "",
    courseCode: student.courseCode,
    status: String(student.status),
  };

  return (
    <EditStudentForm
      student={studentRecord}
      intakeOptions={intakeOptions}
    />
  );
}

function formatDateForInput(
  date: Date | string | null | undefined,
) {
  if (!date) {
    return "";
  }

  return new Date(date).toISOString().split("T")[0];
}
