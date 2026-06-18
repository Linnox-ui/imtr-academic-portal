import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { CourseCoordinatorManager } from "./course-coordinator-manager";

export const dynamic = "force-dynamic";

type CourseCoordinatorsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CourseCoordinatorsPage({
  params,
}: CourseCoordinatorsPageProps) {
  const { id } = await params;

  const [course, eligibleCoordinators] =
    await Promise.all([
      prisma.trainingCourse.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          code: true,
          title: true,
          category: true,
          coordinators: {
            orderBy: [
              {
                isActive: "desc",
              },
              {
                assignedAt: "desc",
              },
            ],
            select: {
              id: true,
              isActive: true,
              assignedAt: true,
              endedAt: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  isActive: true,
                },
              },
              assignedBy: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),

      prisma.user.findMany({
        where: {
          isActive: true,
          role: {
            is: {
              name: "coordinator",
            },
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

  if (!course) {
    notFound();
  }

  const coordinatorOptions =
    eligibleCoordinators.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    }));

  const assignments =
    course.coordinators.map((assignment) => ({
      id: assignment.id,
      isActive: assignment.isActive,
      assignedAt:
        assignment.assignedAt.toISOString(),
      endedAt:
        assignment.endedAt?.toISOString() ||
        null,
      user: assignment.user,
      assignedBy: assignment.assignedBy,
    }));

  return (
    <CourseCoordinatorManager
      course={{
        id: course.id,
        code: course.code,
        title: course.title,
        category: String(course.category),
      }}
      coordinatorOptions={coordinatorOptions}
      assignments={assignments}
    />
  );
}
