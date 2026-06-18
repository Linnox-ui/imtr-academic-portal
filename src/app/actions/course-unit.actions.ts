'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

type CourseUnitActionResult = {
  success?: boolean;
  message?: string;
  unitId?: string;
  error?: string;
};

function normalizeUnitCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

export async function createCourseUnit(
  formData: FormData,
): Promise<CourseUnitActionResult> {
  const courseId = String(formData.get('courseId') || '').trim();
  const code = normalizeUnitCode(String(formData.get('code') || ''));
  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const isActive = formData.get('isActive') === 'on';

  if (!courseId) {
    return {
      error: 'Please select a course.',
    };
  }

  if (!code) {
    return {
      error: 'Unit code is required.',
    };
  }

  if (code.length < 2) {
    return {
      error: 'Unit code must contain at least 2 characters.',
    };
  }

  if (!title) {
    return {
      error: 'Unit title is required.',
    };
  }

  if (title.length < 3) {
    return {
      error: 'Unit title must contain at least 3 characters.',
    };
  }

  try {
    const course = await prisma.trainingCourse.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
        code: true,
        title: true,
      },
    });

    if (!course) {
      return {
        error: 'The selected course was not found.',
      };
    }

    const existingUnit = await prisma.courseUnit.findFirst({
      where: {
        courseId,
        code,
      },
      select: {
        id: true,
      },
    });

    if (existingUnit) {
      return {
        error: `Unit code ${code} already exists under ${course.title}.`,
      };
    }

    const unit = await prisma.courseUnit.create({
      data: {
        courseId,
        code,
        title,
        description: description || null,
        isActive,
      },
    });

    revalidatePath('/academic-director/course-units');
    revalidatePath(`/academic-director/courses/${courseId}`);

    return {
      success: true,
      unitId: unit.id,
      message: `${code} — ${title} created successfully.`,
    };
  } catch (error) {
    console.error('[createCourseUnit]', error);

    return {
      error: 'Failed to create the course unit. Please try again.',
    };
  }
}

export async function updateCourseUnit(
  formData: FormData,
): Promise<CourseUnitActionResult> {
  const id = String(formData.get('id') || '').trim();
  const courseId = String(formData.get('courseId') || '').trim();
  const code = normalizeUnitCode(String(formData.get('code') || ''));
  const title = String(formData.get('title') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const isActive = formData.get('isActive') === 'on';

  if (!id) {
    return {
      error: 'Missing course unit ID.',
    };
  }

  if (!courseId) {
    return {
      error: 'Please select a course.',
    };
  }

  if (!code) {
    return {
      error: 'Unit code is required.',
    };
  }

  if (code.length < 2) {
    return {
      error: 'Unit code must contain at least 2 characters.',
    };
  }

  if (!title || title.length < 3) {
    return {
      error: 'Unit title must contain at least 3 characters.',
    };
  }

  try {
    const currentUnit = await prisma.courseUnit.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        courseId: true,
      },
    });

    if (!currentUnit) {
      return {
        error: 'Course unit was not found.',
      };
    }

    const course = await prisma.trainingCourse.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
        code: true,
        title: true,
      },
    });

    if (!course) {
      return {
        error: 'The selected course was not found.',
      };
    }

    const duplicateUnit = await prisma.courseUnit.findFirst({
      where: {
        courseId,
        code,
        NOT: {
          id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateUnit) {
      return {
        error: `Unit code ${code} already exists under ${course.title}.`,
      };
    }

    const unit = await prisma.courseUnit.update({
      where: {
        id,
      },
      data: {
        courseId,
        code,
        title,
        description: description || null,
        isActive,
      },
    });

    revalidatePath('/academic-director/course-units');
    revalidatePath(`/academic-director/course-units/${id}`);
    revalidatePath(`/academic-director/course-units/${id}/edit`);
    revalidatePath(`/academic-director/courses/${courseId}`);

    if (currentUnit.courseId !== courseId) {
      revalidatePath(
        `/academic-director/courses/${currentUnit.courseId}`,
      );
    }

    return {
      success: true,
      unitId: unit.id,
      message: `${code} — ${title} updated successfully.`,
    };
  } catch (error) {
    console.error('[updateCourseUnit]', error);

    return {
      error: 'Failed to update the course unit. Please try again.',
    };
  }
}

export async function toggleCourseUnitStatus(
  unitId: string,
): Promise<CourseUnitActionResult> {
  if (!unitId) {
    return {
      error: 'Missing course unit ID.',
    };
  }

  try {
    const existingUnit = await prisma.courseUnit.findUnique({
      where: {
        id: unitId,
      },
      select: {
        id: true,
        code: true,
        title: true,
        courseId: true,
        isActive: true,
      },
    });

    if (!existingUnit) {
      return {
        error: 'Course unit was not found.',
      };
    }

    const updatedUnit = await prisma.courseUnit.update({
      where: {
        id: unitId,
      },
      data: {
        isActive: !existingUnit.isActive,
      },
      select: {
        id: true,
        code: true,
        title: true,
        courseId: true,
        isActive: true,
      },
    });

    revalidatePath('/academic-director/course-units');
    revalidatePath(`/academic-director/course-units/${unitId}`);
    revalidatePath(`/academic-director/course-units/${unitId}/edit`);
    revalidatePath(
      `/academic-director/courses/${updatedUnit.courseId}`,
    );

    return {
      success: true,
      unitId: updatedUnit.id,
      message: updatedUnit.isActive
        ? `${updatedUnit.code} activated successfully.`
        : `${updatedUnit.code} deactivated successfully.`,
    };
  } catch (error) {
    console.error('[toggleCourseUnitStatus]', error);

    return {
      error: 'Failed to update course unit status.',
    };
  }
}