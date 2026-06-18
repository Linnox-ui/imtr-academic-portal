import { prisma } from '@/lib/prisma';

/**
 * Generates a collision-proof IMTR Admission Number.
 * Format: IMTR/[COURSE_CODE]/[SEQUENCE]/[YEAR]
 * Example: IMTR/MMTC21/001/2026
 */
export async function generateAdmissionNumber(courseCode: string, year: string): Promise<string> {
  // 1. Create a unique identifier for this specific cohort's counter
  // Example: "MMTC21_2026"
  const counterId = `${courseCode.toUpperCase()}_${year}`;

  // 2. Use a Prisma Transaction to safely increment the counter
  // The 'upsert' command will create the counter at 1 if it's the first student,
  // or increment it by 1 if it already exists.
  const counter = await prisma.$transaction(async (tx) => {
    return await tx.sequenceCounter.upsert({
      where: { id: counterId },
      update: {
        value: { increment: 1 },
      },
      create: {
        id: counterId,
        value: 1,
      },
    });
  });

  // 3. Pad the sequence with leading zeros (e.g., 1 becomes "001", 45 becomes "045")
  const paddedSequence = String(counter.value).padStart(3, '0');

  // 4. Assemble the final official GoK/IMTR format
  return `IMTR/${courseCode.toUpperCase()}/${paddedSequence}/${year}`;
}