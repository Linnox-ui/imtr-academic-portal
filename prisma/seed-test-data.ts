import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Check your .env file before seeding.");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const TEST_PASSWORD = "Test@12345";
const SEED_WEEK_START = new Date("2026-06-15T00:00:00.000Z");

const PERIOD_LABELS: Record<number, string> = {
  1: "08:20 - 09:20",
  2: "09:20 - 10:20",
  3: "11:00 - 12:00",
  4: "12:00 - 13:00",
  5: "14:00 - 15:00",
  6: "15:00 - 16:00",
};

const DAY_OFFSETS: Record<string, number> = {
  MONDAY: 0,
  TUESDAY: 1,
  WEDNESDAY: 2,
  THURSDAY: 3,
  FRIDAY: 4,
};

type SeedLecturer = {
  email: string;
  firstName: string;
  lastName: string;
};

type SeedUnit = {
  code: string;
  title: string;
  year: number;
  semester: number;
};

type SeedIntakeConfig = {
  course: {
    code: string;
    title: string;
    category: "DIPLOMA" | "CERTIFICATE" | "SHORT_COURSE";
    description: string;
    yearsCount: number;
    semestersPerYear: number;
  };
  intake: {
    code: string;
    title: string;
    year: number;
    assessmentMode:
      | "CAT_AND_FINAL_EXAM"
      | "CAT_ONLY"
      | "NO_EXAM"
      | "PRACTICAL_ONLY"
      | "ATTENDANCE_BASED"
      | "COMPETENCY_BASED";
  };
  coordinatorEmail: string;
  studentCodePrefix: string;
  studentsPrefix: string;
  roomPrefix: string;
  units: SeedUnit[];
};

const lecturers: SeedLecturer[] = [
  { email: "test.lecturer.one@imtr.test", firstName: "Test", lastName: "Lecturer One" },
  { email: "test.lecturer.two@imtr.test", firstName: "Test", lastName: "Lecturer Two" },
  { email: "test.lecturer.three@imtr.test", firstName: "Test", lastName: "Lecturer Three" },
  { email: "test.lecturer.four@imtr.test", firstName: "Test", lastName: "Lecturer Four" },
  { email: "test.lecturer.five@imtr.test", firstName: "Test", lastName: "Lecturer Five" },
  { email: "test.lecturer.six@imtr.test", firstName: "Test", lastName: "Lecturer Six" },
];

const intakeConfigs: SeedIntakeConfig[] = [
  {
    course: {
      code: "MMTC-TEST",
      title: "Meteorological Middle Training Course Test",
      category: "DIPLOMA",
      description: "Seeded diploma course for testing coordinator, lecturer, student, timetable, attendance and results workflows.",
      yearsCount: 2,
      semestersPerYear: 2,
    },
    intake: {
      code: "MMTC21T",
      title: "MMTC21 Test Intake 2026",
      year: 2026,
      assessmentMode: "CAT_AND_FINAL_EXAM",
    },
    coordinatorEmail: "test.lecturer.one@imtr.test",
    studentCodePrefix: "MMTC21T",
    studentsPrefix: "MMTC",
    roomPrefix: "Room A",
    units: [
      { code: "MET101T", title: "Basic Meteorology", year: 1, semester: 1 },
      { code: "MET102T", title: "Climatology", year: 1, semester: 1 },
      { code: "MET103T", title: "Weather Instruments", year: 1, semester: 2 },
      { code: "MET104T", title: "Communication Skills", year: 1, semester: 2 },
      { code: "MET201T", title: "Synoptic Meteorology", year: 2, semester: 1 },
      { code: "MET202T", title: "Agrometeorology", year: 2, semester: 2 },
    ],
  },
  {
    course: {
      code: "OTC-TEST",
      title: "Observer Training Course Test",
      category: "SHORT_COURSE",
      description: "Seeded no-exam/short-course style intake for testing flexible IMTR workflows.",
      yearsCount: 1,
      semestersPerYear: 2,
    },
    intake: {
      code: "OTC01T",
      title: "OTC01 Test Intake 2026",
      year: 2026,
      assessmentMode: "NO_EXAM",
    },
    coordinatorEmail: "test.lecturer.two@imtr.test",
    studentCodePrefix: "OTC01T",
    studentsPrefix: "OTC",
    roomPrefix: "Room B",
    units: [
      { code: "OTC101T", title: "Weather Observation Basics", year: 1, semester: 1 },
      { code: "OTC102T", title: "Station Instruments", year: 1, semester: 1 },
      { code: "OTC103T", title: "Weather Codes and Records", year: 1, semester: 2 },
      { code: "OTC104T", title: "Station Practice", year: 1, semester: 2 },
    ],
  },
];

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function fullName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

async function findRequiredSeedActor() {
  const user = await prisma.user.findFirst({
    where: {
      isActive: true,
      accountStatus: "ACTIVE",
      role: {
        name: {
          in: ["academic_director", "super_admin"],
        },
      },
    },
    include: {
      role: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!user) {
    throw new Error(
      "No active Academic Director or Super Admin account found. Create/login existing admin first. This seed will not create a new Academic Director or Super Admin.",
    );
  }

  return user;
}

async function getOrCreateRole(name: string, description: string) {
  return prisma.role.upsert({
    where: { name },
    update: { description },
    create: { name, description },
  });
}

async function upsertUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  passwordHash: string;
}) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      roleId: input.roleId,
      isActive: true,
      accountStatus: "ACTIVE",
      requiresPasswordChange: false,
      password: input.passwordHash,
    },
    create: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      roleId: input.roleId,
      isActive: true,
      accountStatus: "ACTIVE",
      requiresPasswordChange: false,
      password: input.passwordHash,
    },
  });
}

async function upsertCourse(config: SeedIntakeConfig["course"]) {
  return prisma.trainingCourse.upsert({
    where: { code: config.code },
    update: {
      title: config.title,
      category: config.category,
      description: config.description,
    },
    create: {
      code: config.code,
      title: config.title,
      category: config.category,
      description: config.description,
    },
  });
}

async function upsertIntake(config: SeedIntakeConfig["intake"], courseId: string) {
  return prisma.intake.upsert({
    where: { code: config.code },
    update: {
      title: config.title,
      year: config.year,
      courseId,
      assessmentMode: config.assessmentMode,
      status: "ACTIVE",
    },
    create: {
      code: config.code,
      title: config.title,
      year: config.year,
      courseId,
      assessmentMode: config.assessmentMode,
      status: "ACTIVE",
    },
  });
}

async function clearDynamicSeedData(intakeIds: string[]) {
  if (intakeIds.length === 0) return;

  const submissions = await prisma.resultSubmission.findMany({
    where: {
      assessment: {
        intakeId: {
          in: intakeIds,
        },
      },
    },
    select: { id: true },
  });

  const submissionIds = submissions.map((submission) => submission.id);

  if (submissionIds.length) {
    const resultIds = await prisma.studentAssessmentResult.findMany({
      where: { submissionId: { in: submissionIds } },
      select: { id: true },
    });

    await prisma.studentResultChangeHistory.deleteMany({
      where: {
        studentResultId: {
          in: resultIds.map((result) => result.id),
        },
      },
    });

    await prisma.studentAssessmentResult.deleteMany({
      where: { submissionId: { in: submissionIds } },
    });

    await prisma.resultWorkflowHistory.deleteMany({
      where: { submissionId: { in: submissionIds } },
    });

    await prisma.resultSubmission.deleteMany({
      where: { id: { in: submissionIds } },
    });
  }

  await prisma.assessment.deleteMany({
    where: { intakeId: { in: intakeIds } },
  });

  await prisma.studentAttendanceRecord.deleteMany({
    where: {
      attendanceSession: {
        intakeId: {
          in: intakeIds,
        },
      },
    },
  });

  await prisma.attendanceSession.deleteMany({
    where: { intakeId: { in: intakeIds } },
  });

  await prisma.timetableEntry.deleteMany({
    where: { intakeId: { in: intakeIds } },
  });

  await prisma.lecturerUnitAllocation.deleteMany({
    where: { intakeId: { in: intakeIds } },
  });

  await prisma.semesterUnitAssignment.deleteMany({
    where: { intakeId: { in: intakeIds } },
  });

  await prisma.intakeCoordinatorAssignment.deleteMany({
    where: { intakeId: { in: intakeIds } },
  });
}

async function ensureCourseStructure(courseId: string, yearsCount: number, semestersPerYear: number) {
  const semestersByKey = new Map<string, { id: string }>();

  for (let yearNumber = 1; yearNumber <= yearsCount; yearNumber += 1) {
    const year = await prisma.courseYear.upsert({
      where: {
        courseId_yearNumber: {
          courseId,
          yearNumber,
        },
      },
      update: {
        title: `Year ${yearNumber}`,
        sequence: yearNumber,
        isActive: true,
      },
      create: {
        courseId,
        yearNumber,
        title: `Year ${yearNumber}`,
        sequence: yearNumber,
        isActive: true,
      },
    });

    for (let semesterNumber = 1; semesterNumber <= semestersPerYear; semesterNumber += 1) {
      const semester = await prisma.courseSemester.upsert({
        where: {
          courseYearId_sequence: {
            courseYearId: year.id,
            sequence: semesterNumber,
          },
        },
        update: {
          title: `Semester ${semesterNumber}`,
          semesterNumber,
          periodType: "SEMESTER",
          isActive: true,
        },
        create: {
          courseYearId: year.id,
          title: `Semester ${semesterNumber}`,
          semesterNumber,
          sequence: semesterNumber,
          periodType: "SEMESTER",
          isActive: true,
        },
      });

      semestersByKey.set(`${yearNumber}-${semesterNumber}`, semester);
    }
  }

  return semestersByKey;
}

async function upsertUnits(courseId: string, units: SeedUnit[]) {
  const unitsByCode = new Map<string, { id: string; code: string; title: string }>();

  for (const unit of units) {
    const record = await prisma.courseUnit.upsert({
      where: {
        courseId_code: {
          courseId,
          code: unit.code,
        },
      },
      update: {
        title: unit.title,
        isActive: true,
      },
      create: {
        courseId,
        code: unit.code,
        title: unit.title,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        title: true,
      },
    });

    unitsByCode.set(unit.code, record);
  }

  return unitsByCode;
}

async function createStudentsForIntake(input: {
  intakeId: string;
  intakeCode: string;
  intakeYear: number;
  studentCodePrefix: string;
  studentsPrefix: string;
  studentRoleId: string;
  passwordHash: string;
}) {
  const students: { id: string; firstName: string; lastName: string; email: string; admissionNumber: string }[] = [];

  for (let index = 1; index <= 10; index += 1) {
    const padded = String(index).padStart(3, "0");
    const firstName = `${input.studentsPrefix}Student${padded}`;
    const lastName = "Test";
    const email = `${input.studentCodePrefix.toLowerCase()}.student${padded}@imtr.test`;
    const admissionNumber = `IMTR/${input.studentCodePrefix}/${padded}/${input.intakeYear}`;
    const nationalId = `${input.studentCodePrefix.replace(/\D/g, "").padEnd(3, "0")}${String(index).padStart(6, "0")}`;

    const user = await upsertUser({
      email,
      firstName,
      lastName,
      roleId: input.studentRoleId,
      passwordHash: input.passwordHash,
    });

    const student = await prisma.student.upsert({
      where: { admissionNumber },
      update: {
        firstName,
        lastName,
        nationalId,
        gender: index % 2 === 0 ? "Female" : "Male",
        dateOfBirth: new Date(`200${index % 10}-01-15T00:00:00.000Z`),
        email,
        phone: `+254700${String(index).padStart(6, "0")}`,
        courseCode: input.intakeCode,
        intakeId: input.intakeId,
        status: "ACTIVE",
      },
      create: {
        admissionNumber,
        firstName,
        lastName,
        nationalId,
        gender: index % 2 === 0 ? "Female" : "Male",
        dateOfBirth: new Date(`200${index % 10}-01-15T00:00:00.000Z`),
        email,
        phone: `+254700${String(index).padStart(6, "0")}`,
        courseCode: input.intakeCode,
        intakeId: input.intakeId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        admissionNumber: true,
      },
    });

    await prisma.studentProfile.upsert({
      where: { admissionNumber },
      update: {
        userId: user.id,
        intakeId: input.intakeId,
        academicStatus: "ACTIVE",
      },
      create: {
        admissionNumber,
        userId: user.id,
        intakeId: input.intakeId,
        academicStatus: "ACTIVE",
      },
    });

    students.push(student);
  }

  return students;
}

async function createApprovedUnitPlan(input: {
  intakeId: string;
  coordinatorId: string;
  reviewerId: string;
  units: SeedUnit[];
  unitsByCode: Map<string, { id: string; code: string; title: string }>;
  semestersByKey: Map<string, { id: string }>;
}) {
  const assignments: {
    id: string;
    unitCode: string;
    unitTitle: string;
    year: number;
    semester: number;
  }[] = [];

  for (const unit of input.units) {
    const unitRecord = input.unitsByCode.get(unit.code);
    const semesterRecord = input.semestersByKey.get(`${unit.year}-${unit.semester}`);

    if (!unitRecord || !semesterRecord) {
      throw new Error(`Missing unit or semester for ${unit.code}`);
    }

    const assignment = await prisma.semesterUnitAssignment.create({
      data: {
        intakeId: input.intakeId,
        unitId: unitRecord.id,
        semesterId: semesterRecord.id,
        status: "APPROVED",
        createdById: input.coordinatorId,
        submittedById: input.coordinatorId,
        reviewedById: input.reviewerId,
        submittedAt: new Date(),
        reviewedAt: new Date(),
        reviewNote: "Seed-approved unit plan for end-to-end testing.",
      },
      select: {
        id: true,
      },
    });

    assignments.push({
      id: assignment.id,
      unitCode: unit.code,
      unitTitle: unit.title,
      year: unit.year,
      semester: unit.semester,
    });
  }

  return assignments;
}

async function createLecturerAllocations(input: {
  intakeId: string;
  coordinatorId: string;
  assignments: { id: string; unitCode: string; unitTitle: string }[];
  lecturersByEmail: Map<string, { id: string; email: string; firstName: string; lastName: string }>;
}) {
  const lecturerCycle = [
    "test.lecturer.three@imtr.test",
    "test.lecturer.four@imtr.test",
    "test.lecturer.five@imtr.test",
    "test.lecturer.six@imtr.test",
    "test.lecturer.one@imtr.test",
    "test.lecturer.two@imtr.test",
  ];

  const allocations: {
    id: string;
    unitAssignmentId: string;
    unitCode: string;
    unitTitle: string;
    lecturerId: string;
    lecturerName: string;
  }[] = [];

  for (let index = 0; index < input.assignments.length; index += 1) {
    const assignment = input.assignments[index];
    const lecturerEmail = lecturerCycle[index % lecturerCycle.length];
    const lecturer = input.lecturersByEmail.get(lecturerEmail);

    if (!lecturer) {
      throw new Error(`Missing lecturer ${lecturerEmail}`);
    }

    const allocation = await prisma.lecturerUnitAllocation.create({
      data: {
        intakeId: input.intakeId,
        unitAssignmentId: assignment.id,
        lecturerId: lecturer.id,
        allocatedById: input.coordinatorId,
        allocationRole: "PRIMARY",
        isActive: true,
        startsAt: new Date(),
        changeReason: "Seed allocation for testing.",
      },
      select: {
        id: true,
      },
    });

    allocations.push({
      id: allocation.id,
      unitAssignmentId: assignment.id,
      unitCode: assignment.unitCode,
      unitTitle: assignment.unitTitle,
      lecturerId: lecturer.id,
      lecturerName: fullName(lecturer),
    });
  }

  return allocations;
}

async function createTimetable(input: {
  intakeId: string;
  createdById: string;
  allocations: {
    id: string;
    unitAssignmentId: string;
    unitCode: string;
    unitTitle: string;
    lecturerId: string;
  }[];
  roomPrefix: string;
}) {
  const schedule = [
    { dayOfWeek: "MONDAY", startPeriod: 1, endPeriod: 2 },
    { dayOfWeek: "MONDAY", startPeriod: 3, endPeriod: 4 },
    { dayOfWeek: "TUESDAY", startPeriod: 1, endPeriod: 1 },
    { dayOfWeek: "WEDNESDAY", startPeriod: 1, endPeriod: 2 },
    { dayOfWeek: "THURSDAY", startPeriod: 3, endPeriod: 4 },
    { dayOfWeek: "FRIDAY", startPeriod: 5, endPeriod: 6 },
  ];

  const entries: {
    id: string;
    intakeId: string;
    lecturerId: string;
    unitAssignmentId: string;
    dayOfWeek: string;
    startPeriod: number;
    endPeriod: number;
  }[] = [];

  for (let index = 0; index < input.allocations.length; index += 1) {
    const allocation = input.allocations[index];
    const slot = schedule[index % schedule.length];

    const entry = await prisma.timetableEntry.create({
      data: {
        intakeId: input.intakeId,
        unitAssignmentId: allocation.unitAssignmentId,
        lecturerAllocationId: allocation.id,
        lecturerId: allocation.lecturerId,
        dayOfWeek: slot.dayOfWeek as any,
        startPeriod: slot.startPeriod,
        endPeriod: slot.endPeriod,
        room: `${input.roomPrefix}${index + 1}`,
        notes: `${allocation.unitCode} seeded timetable session (${PERIOD_LABELS[slot.startPeriod]} to ${PERIOD_LABELS[slot.endPeriod]}).`,
        isActive: true,
        createdById: input.createdById,
      },
      select: {
        id: true,
        intakeId: true,
        lecturerId: true,
        unitAssignmentId: true,
        dayOfWeek: true,
        startPeriod: true,
        endPeriod: true,
      },
    });

    entries.push(entry as any);
  }

  return entries;
}

async function createAttendanceForWeek(input: {
  students: { id: string }[];
  timetableEntries: {
    id: string;
    intakeId: string;
    lecturerId: string;
    dayOfWeek: string;
    startPeriod: number;
    endPeriod: number;
  }[];
}) {
  for (const entry of input.timetableEntries) {
    const sessionDate = addDays(SEED_WEEK_START, DAY_OFFSETS[entry.dayOfWeek] ?? 0);

    const session = await prisma.attendanceSession.create({
      data: {
        intakeId: entry.intakeId,
        timetableEntryId: entry.id,
        sessionDate,
        dayOfWeek: entry.dayOfWeek as any,
        startPeriod: entry.startPeriod,
        endPeriod: entry.endPeriod,
        takenById: entry.lecturerId,
        notes: "Seeded attendance session.",
      },
      select: {
        id: true,
      },
    });

    for (let index = 0; index < input.students.length; index += 1) {
      const student = input.students[index];
      const status = index === 7 ? "LATE" : index === 8 ? "EXCUSED" : index === 9 ? "ABSENT" : "PRESENT";

      await prisma.studentAttendanceRecord.create({
        data: {
          attendanceSessionId: session.id,
          studentId: student.id,
          status: status as any,
          markedById: entry.lecturerId,
          remarks: status === "PRESENT" ? null : `Seeded ${status.toLowerCase()} record.`,
        },
      });
    }
  }
}

async function createResultSubmission(input: {
  assessmentId: string;
  status: string;
  lecturerId: string;
  coordinatorId: string;
  academicDirectorId: string;
  students: { id: string }[];
  maxMarks: number;
}) {
  const now = new Date();

  const submission = await prisma.resultSubmission.create({
    data: {
      assessmentId: input.assessmentId,
      status: input.status as any,
      version: 1,
      createdById: input.lecturerId,
      submittedToCoordinatorAt: [
        "SUBMITTED_TO_COORDINATOR",
        "SUBMITTED_TO_ACADEMIC_DIRECTOR",
        "FINAL_APPROVED",
        "PUBLISHED",
      ].includes(input.status)
        ? now
        : null,
      coordinatorReviewedById: ["SUBMITTED_TO_ACADEMIC_DIRECTOR", "FINAL_APPROVED", "PUBLISHED"].includes(input.status)
        ? input.coordinatorId
        : null,
      coordinatorReviewedAt: ["SUBMITTED_TO_ACADEMIC_DIRECTOR", "FINAL_APPROVED", "PUBLISHED"].includes(input.status)
        ? now
        : null,
      coordinatorComment: ["SUBMITTED_TO_ACADEMIC_DIRECTOR", "FINAL_APPROVED", "PUBLISHED"].includes(input.status)
        ? "Seed coordinator review complete."
        : null,
      submittedToAcademicDirectorAt: ["SUBMITTED_TO_ACADEMIC_DIRECTOR", "FINAL_APPROVED", "PUBLISHED"].includes(input.status)
        ? now
        : null,
      academicReviewedById: ["FINAL_APPROVED", "PUBLISHED"].includes(input.status) ? input.academicDirectorId : null,
      academicReviewedAt: ["FINAL_APPROVED", "PUBLISHED"].includes(input.status) ? now : null,
      academicComment: ["FINAL_APPROVED", "PUBLISHED"].includes(input.status) ? "Seed academic review complete." : null,
      finalApprovedAt: ["FINAL_APPROVED", "PUBLISHED"].includes(input.status) ? now : null,
      publishedById: input.status === "PUBLISHED" ? input.academicDirectorId : null,
      publishedAt: input.status === "PUBLISHED" ? now : null,
    },
    select: {
      id: true,
    },
  });

  for (let index = 0; index < input.students.length; index += 1) {
    const marks = Math.min(input.maxMarks, 18 + index + (index % 3));

    await prisma.studentAssessmentResult.create({
      data: {
        submissionId: submission.id,
        studentId: input.students[index].id,
        marks: new Prisma.Decimal(marks),
        isAbsent: false,
        isExempted: false,
        remarks: "Seeded result mark.",
        enteredById: input.lecturerId,
        lastEditedById: input.lecturerId,
      },
    });
  }

  const historyItems: { action: string; fromStatus: string | null; toStatus: string; comment: string }[] = [
    { action: "CREATED", fromStatus: null, toStatus: "DRAFT", comment: "Seed result sheet created." },
  ];

  if (input.status !== "DRAFT") {
    historyItems.push({
      action: "SUBMITTED_TO_COORDINATOR",
      fromStatus: "DRAFT",
      toStatus: "SUBMITTED_TO_COORDINATOR",
      comment: "Seed submitted to coordinator.",
    });
  }

  if (["SUBMITTED_TO_ACADEMIC_DIRECTOR", "FINAL_APPROVED", "PUBLISHED"].includes(input.status)) {
    historyItems.push({
      action: "COORDINATOR_APPROVED_AND_FORWARDED",
      fromStatus: "SUBMITTED_TO_COORDINATOR",
      toStatus: "SUBMITTED_TO_ACADEMIC_DIRECTOR",
      comment: "Seed coordinator forwarded to Academic Director.",
    });
  }

  if (["FINAL_APPROVED", "PUBLISHED"].includes(input.status)) {
    historyItems.push({
      action: "FINAL_APPROVED",
      fromStatus: "SUBMITTED_TO_ACADEMIC_DIRECTOR",
      toStatus: "FINAL_APPROVED",
      comment: "Seed final approval.",
    });
  }

  if (input.status === "PUBLISHED") {
    historyItems.push({
      action: "PUBLISHED",
      fromStatus: "FINAL_APPROVED",
      toStatus: "PUBLISHED",
      comment: "Seed published CAT result.",
    });
  }

  for (const history of historyItems) {
    await prisma.resultWorkflowHistory.create({
      data: {
        submissionId: submission.id,
        action: history.action as any,
        fromStatus: history.fromStatus as any,
        toStatus: history.toStatus as any,
        performedById:
          history.action === "CREATED" || history.action === "SUBMITTED_TO_COORDINATOR"
            ? input.lecturerId
            : history.action === "COORDINATOR_APPROVED_AND_FORWARDED"
              ? input.coordinatorId
              : input.academicDirectorId,
        comment: history.comment,
      },
    });
  }
}

async function createResults(input: {
  intakeId: string;
  coordinatorId: string;
  academicDirectorId: string;
  students: { id: string }[];
  assignments: { id: string; unitCode: string; unitTitle: string }[];
  allocations: { unitAssignmentId: string; lecturerId: string; id: string; unitCode: string }[];
}) {
  const statusPlan = [
    { type: "CAT_1", suffix: "CAT1", title: "CAT 1", status: "PUBLISHED" },
    { type: "CAT_1", suffix: "CAT1", title: "CAT 1", status: "SUBMITTED_TO_COORDINATOR" },
    { type: "CAT_2", suffix: "CAT2", title: "CAT 2", status: "SUBMITTED_TO_ACADEMIC_DIRECTOR" },
    { type: "CAT_2", suffix: "CAT2", title: "CAT 2", status: "FINAL_APPROVED" },
  ];

  const count = Math.min(input.assignments.length, statusPlan.length);

  for (let index = 0; index < count; index += 1) {
    const assignment = input.assignments[index];
    const allocation = input.allocations.find((item) => item.unitAssignmentId === assignment.id);
    const statusConfig = statusPlan[index];

    if (!allocation) continue;

    const assessment = await prisma.assessment.create({
      data: {
        intakeId: input.intakeId,
        unitAssignmentId: assignment.id,
        lecturerAllocationId: allocation.id,
        code: `${assignment.unitCode}-${statusConfig.suffix}`,
        title: `${assignment.unitTitle} ${statusConfig.title}`,
        type: statusConfig.type as any,
        maxMarks: new Prisma.Decimal(30),
        weightPercent: new Prisma.Decimal(20),
        assessmentDate: addDays(SEED_WEEK_START, index),
        isActive: true,
        createdById: allocation.lecturerId,
      },
      select: { id: true },
    });

    await createResultSubmission({
      assessmentId: assessment.id,
      status: statusConfig.status,
      lecturerId: allocation.lecturerId,
      coordinatorId: input.coordinatorId,
      academicDirectorId: input.academicDirectorId,
      students: input.students,
      maxMarks: 30,
    });
  }
}

async function main() {
  const seedActor = await findRequiredSeedActor();
  console.log(`Using existing ${seedActor.role.name}: ${seedActor.email}`);

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const lecturerRole = await getOrCreateRole("lecturer", "Lecturer");
  const studentRole = await getOrCreateRole("student", "Student");

  const lecturerRecords = new Map<string, Awaited<ReturnType<typeof upsertUser>>>();

  for (const lecturer of lecturers) {
    const user = await upsertUser({
      email: lecturer.email,
      firstName: lecturer.firstName,
      lastName: lecturer.lastName,
      roleId: lecturerRole.id,
      passwordHash,
    });

    lecturerRecords.set(lecturer.email, user);
  }

  const seededIntakes: { id: string; code: string }[] = [];

  for (const config of intakeConfigs) {
    const course = await upsertCourse(config.course);
    const intake = await upsertIntake(config.intake, course.id);
    seededIntakes.push({ id: intake.id, code: intake.code });
  }

  await clearDynamicSeedData(seededIntakes.map((intake) => intake.id));

  for (const config of intakeConfigs) {
    const course = await upsertCourse(config.course);
    const intake = await upsertIntake(config.intake, course.id);
    const coordinator = lecturerRecords.get(config.coordinatorEmail);

    if (!coordinator) {
      throw new Error(`Coordinator ${config.coordinatorEmail} was not created.`);
    }

    const semestersByKey = await ensureCourseStructure(course.id, config.course.yearsCount, config.course.semestersPerYear);
    const unitsByCode = await upsertUnits(course.id, config.units);

    await prisma.intakeCoordinatorAssignment.create({
      data: {
        intakeId: intake.id,
        coordinatorId: coordinator.id,
        assignedById: seedActor.id,
        isActive: true,
        assignedAt: new Date(),
        changeReason: "Seed coordinator assignment for testing.",
      },
    });

    const students = await createStudentsForIntake({
      intakeId: intake.id,
      intakeCode: intake.code,
      intakeYear: intake.year,
      studentCodePrefix: config.studentCodePrefix,
      studentsPrefix: config.studentsPrefix,
      studentRoleId: studentRole.id,
      passwordHash,
    });

    const assignments = await createApprovedUnitPlan({
      intakeId: intake.id,
      coordinatorId: coordinator.id,
      reviewerId: seedActor.id,
      units: config.units,
      unitsByCode,
      semestersByKey,
    });

    const allocations = await createLecturerAllocations({
      intakeId: intake.id,
      coordinatorId: coordinator.id,
      assignments,
      lecturersByEmail: lecturerRecords,
    });

    const timetableEntries = await createTimetable({
      intakeId: intake.id,
      createdById: coordinator.id,
      allocations,
      roomPrefix: config.roomPrefix,
    });

    await createAttendanceForWeek({
      students,
      timetableEntries,
    });

    await createResults({
      intakeId: intake.id,
      coordinatorId: coordinator.id,
      academicDirectorId: seedActor.id,
      students,
      assignments,
      allocations,
    });

    console.log(`Seeded ${intake.code}: ${students.length} students, ${assignments.length} approved units, ${allocations.length} allocations, ${timetableEntries.length} timetable entries.`);
  }

  console.log("\nSeed complete.");
  console.log(`Test password for seeded lecturers/students: ${TEST_PASSWORD}`);
  console.log("Seeded coordinator logins:");
  console.log("- test.lecturer.one@imtr.test  (coordinates MMTC21T)");
  console.log("- test.lecturer.two@imtr.test  (coordinates OTC01T)");
  console.log("Sample student logins:");
  console.log("- mmtc21t.student001@imtr.test");
  console.log("- otc01t.student001@imtr.test");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
