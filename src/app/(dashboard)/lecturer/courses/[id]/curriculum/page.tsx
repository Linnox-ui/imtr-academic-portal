import { notFound, redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getApprovedCourseCurriculum } from '@/lib/approved-curriculum';

import { ApprovedCurriculumView } from '@/components/academic/approved-curriculum-view';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = [
  'lecturer',
  'coordinator',
  'academic_director',
  'super_admin',
];

type LecturerCurriculumPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LecturerCurriculumPage({
  params,
}: LecturerCurriculumPageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
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

  if (
    !currentUser ||
    !currentUser.isActive ||
    !ALLOWED_ROLES.includes(currentUser.role.name)
  ) {
    redirect('/unauthorized');
  }

  const course = await getApprovedCourseCurriculum(id);

  if (!course) {
    notFound();
  }

  return (
    <ApprovedCurriculumView
      course={course}
      audience="LECTURER"
      backHref="/lecturer"
    />
  );
}