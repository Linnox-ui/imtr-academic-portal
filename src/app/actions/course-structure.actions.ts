'use server';

import { revalidatePath } from 'next/cache';
import { AcademicPeriodType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type StructureActionResult = {
  success?: boolean;
  message?: string;
  error?: string;
};

export async function createCourseYear(
  formData: FormData,
): Promise<StructureActionResult> {
  const courseId = String(formData.get('courseId') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const yearNumber = Number(formData.get('yearNumber'));
  const sequence = Number(formData.get('sequence'));
  const isActive = formData.get('isActive') === 'on';

  if (!courseId) {
    return { error: 'Missing course ID.' };
  }

  if (!title) {
    return { error: 'Academic year title is required.' };
  }

  if (!Number.isInteger(yearNumber) || yearNumber < 1) {
    return { error: 'Year number must be a positive whole number.' };
  }

  if (!Number.isInteger(sequence) || sequence < 1) {
    return { error: 'Sequence must be a positive whole number.' };
  }

  try {
    const course = await prisma.trainingCourse.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
      },
    });

    if (!course) {
      return { error: 'Course was not found.' };
    }

    const duplicate = await prisma.courseYear.findFirst({
      where: {
        courseId,
        OR: [{ yearNumber }, { sequence }],
      },
      select: {
        yearNumber: true,
        sequence: true,
      },
    });

    if (duplicate) {
      if (duplicate.yearNumber === yearNumber) {
        return {
          error: `Year ${yearNumber} already exists under this course.`,
        };
      }

      return {
        error: `Sequence ${sequence} is already in use under this course.`,
      };
    }

    await prisma.courseYear.create({
      data: {
        courseId,
        title,
        yearNumber,
        sequence,
        isActive,
      },
    });

    revalidatePath(`/academic-director/courses/${courseId}`);
    revalidatePath(`/academic-director/courses/${courseId}/structure`);

    return {
      success: true,
      message: `${title} created successfully.`,
    };
  } catch (error) {
    console.error('[createCourseYear]', error);

    return {
      error: 'Failed to create the course year.',
    };
  }
}

export async function createCourseSemester(
  formData: FormData,
): Promise<StructureActionResult> {
  const courseId = String(formData.get('courseId') || '').trim();
  const courseYearId = String(formData.get('courseYearId') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const sequence = Number(formData.get('sequence'));
  const periodTypeValue = String(
    formData.get('periodType') || 'SEMESTER',
  ).trim();

  const semesterNumberValue = String(
    formData.get('semesterNumber') || '',
  ).trim();

  const semesterNumber = semesterNumberValue
    ? Number(semesterNumberValue)
    : null;

  const isActive = formData.get('isActive') === 'on';

  const validPeriodTypes: AcademicPeriodType[] = [
    AcademicPeriodType.SEMESTER,
    AcademicPeriodType.TRAINING_BLOCK,
  ];

  if (!courseId || !courseYearId) {
    return { error: 'Please select a course year.' };
  }

  if (!title) {
    return { error: 'Semester or training block title is required.' };
  }

  if (!Number.isInteger(sequence) || sequence < 1) {
    return { error: 'Sequence must be a positive whole number.' };
  }

  if (
    !validPeriodTypes.includes(
      periodTypeValue as AcademicPeriodType,
    )
  ) {
    return { error: 'Invalid academic period type.' };
  }

  if (
    periodTypeValue === AcademicPeriodType.SEMESTER &&
    (!semesterNumber ||
      !Number.isInteger(semesterNumber) ||
      semesterNumber < 1)
  ) {
    return {
      error: 'Semester number is required for semester periods.',
    };
  }

  try {
    const courseYear = await prisma.courseYear.findFirst({
      where: {
        id: courseYearId,
        courseId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!courseYear) {
      return {
        error: 'The selected course year was not found.',
      };
    }

    const duplicateSequence =
      await prisma.courseSemester.findFirst({
        where: {
          courseYearId,
          sequence,
        },
        select: {
          id: true,
        },
      });

    if (duplicateSequence) {
      return {
        error: `Sequence ${sequence} is already used under ${courseYear.title}.`,
      };
    }

    if (
      periodTypeValue === AcademicPeriodType.SEMESTER &&
      semesterNumber
    ) {
      const duplicateSemester =
        await prisma.courseSemester.findFirst({
          where: {
            courseYearId,
            semesterNumber,
            periodType: AcademicPeriodType.SEMESTER,
          },
          select: {
            id: true,
          },
        });

      if (duplicateSemester) {
        return {
          error: `Semester ${semesterNumber} already exists under ${courseYear.title}.`,
        };
      }
    }

    await prisma.courseSemester.create({
      data: {
        courseYearId,
        title,
        semesterNumber:
          periodTypeValue === AcademicPeriodType.SEMESTER
            ? semesterNumber
            : null,
        sequence,
        periodType:
          periodTypeValue as AcademicPeriodType,
        isActive,
      },
    });

    revalidatePath(`/academic-director/courses/${courseId}`);
    revalidatePath(
      `/academic-director/courses/${courseId}/structure`,
    );

    return {
      success: true,
      message: `${title} created successfully.`,
    };
  } catch (error) {
    console.error('[createCourseSemester]', error);

    return {
      error: 'Failed to create the semester or training block.',
    };
  }
}