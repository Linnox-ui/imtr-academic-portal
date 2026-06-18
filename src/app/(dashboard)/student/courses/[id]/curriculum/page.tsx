import { notFound, redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import {
  getApprovedCourseCurriculum,
  getStudentCourseIdByEmail,
} from '@/lib/approved-curriculum';

import { ApprovedCurriculumView } from '@/components/academic/approved-curriculum-view';

export const dynamic = 'force-dynamic';

type StudentCurriculumPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentCurriculumPage({
  params,
}: StudentCurriculumPageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    redirect('/unauthorized');
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      isActive: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!currentUser || !currentUser.isActive) {
    redirect('/unauthorized');
  }

  const role = currentUser.role.name;

  if (
    role !== 'student' &&
    role !== 'super_admin' &&
    role !== 'academic_director'
  ) {
    redirect('/unauthorized');
  }

  if (role === 'student') {
    const studentCourseId = await getStudentCourseIdByEmail(
      session.user.email,
    );

    if (!studentCourseId || studentCourseId !== id) {
      redirect('/unauthorized');
    }
  }

  const course = await getApprovedCourseCurriculum(id);

  if (!course) {
    notFound();
  }

  return (
    <ApprovedCurriculumView
      course={course}
      audience="STUDENT"
      backHref="/student"
    />
  );
}