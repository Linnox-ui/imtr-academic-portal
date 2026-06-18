-- CreateEnum
CREATE TYPE "CourseCategory" AS ENUM ('DIPLOMA', 'CERTIFICATE', 'SHORT_COURSE');

-- CreateEnum
CREATE TYPE "AssessmentMode" AS ENUM ('CAT_AND_FINAL_EXAM', 'CAT_ONLY', 'NO_EXAM', 'PRACTICAL_ONLY', 'ATTENDANCE_BASED', 'COMPETENCY_BASED');

-- CreateEnum
CREATE TYPE "AcademicPeriodType" AS ENUM ('SEMESTER', 'TRAINING_BLOCK');

-- CreateEnum
CREATE TYPE "UnitAssignmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'AMENDMENT_REQUESTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LecturerAllocationRole" AS ENUM ('PRIMARY', 'CO_LECTURER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "TimetableDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('CAT_1', 'CAT_2', 'ASSIGNMENT', 'PRACTICAL', 'PROJECT', 'FINAL_EXAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ResultWorkflowStatus" AS ENUM ('DRAFT', 'SUBMITTED_TO_COORDINATOR', 'RETURNED_TO_LECTURER', 'SUBMITTED_TO_ACADEMIC_DIRECTOR', 'RETURNED_TO_COORDINATOR', 'FINAL_APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ResultWorkflowAction" AS ENUM ('CREATED', 'DRAFT_SAVED', 'SUBMITTED_TO_COORDINATOR', 'RETURNED_TO_LECTURER', 'RESUBMITTED_TO_COORDINATOR', 'COORDINATOR_APPROVED_AND_FORWARDED', 'RETURNED_TO_COORDINATOR', 'RESUBMITTED_TO_ACADEMIC_DIRECTOR', 'FINAL_APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "RecoveryTicketType" AS ENUM ('NEW_ACCOUNT_ACTIVATION', 'PASSWORD_RECOVERY', 'LOST_CONTACT_ACCESS', 'LOCKED_ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "RecoveryTicketStatus" AS ENUM ('SUBMITTED', 'IDENTITY_REVIEW', 'MORE_INFORMATION_REQUIRED', 'VERIFIED', 'RESET_AUTHORIZED', 'RESOLVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RecoveryMessageSender" AS ENUM ('CLAIMANT', 'ICT_ADMIN', 'SUPER_ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RecoveryTokenPurpose" AS ENUM ('ACCOUNT_ACTIVATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "IdentityVerificationMethod" AS ENUM ('IDENTITY_RECORD_MATCH', 'EMAIL_OTP', 'PHONE_OTP', 'MANUAL_ICT_REVIEW');

-- CreateEnum
CREATE TYPE "IdentityVerificationStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT true,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCourse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "CourseCategory" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseUnit" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseYear" (
    "id" TEXT NOT NULL,
    "yearNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseSemester" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "semesterNumber" INTEGER,
    "sequence" INTEGER NOT NULL,
    "periodType" "AcademicPeriodType" NOT NULL DEFAULT 'SEMESTER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "courseYearId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseSemester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemesterUnitAssignment" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT,
    "semesterId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "status" "UnitAssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "submittedById" TEXT,
    "reviewedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SemesterUnitAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseCoordinatorAssignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseCoordinatorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeCoordinatorAssignment" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "coordinatorId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeCoordinatorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intake" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sequenceCounter" INTEGER NOT NULL DEFAULT 0,
    "assessmentMode" "AssessmentMode" NOT NULL DEFAULT 'CAT_AND_FINAL_EXAM',
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "enrollmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "academicStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequenceCounter" (
    "id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SequenceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nationalId" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "intakeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturerUnitAllocation" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "unitAssignmentId" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "allocatedById" TEXT NOT NULL,
    "endedById" TEXT,
    "allocationRole" "LecturerAllocationRole" NOT NULL DEFAULT 'PRIMARY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "changeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LecturerUnitAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "unitAssignmentId" TEXT NOT NULL,
    "lecturerAllocationId" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "dayOfWeek" "TimetableDay" NOT NULL,
    "startPeriod" INTEGER NOT NULL,
    "endPeriod" INTEGER NOT NULL,
    "room" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "timetableEntryId" TEXT NOT NULL,
    "sessionDate" DATE NOT NULL,
    "dayOfWeek" "TimetableDay" NOT NULL,
    "startPeriod" INTEGER NOT NULL,
    "endPeriod" INTEGER NOT NULL,
    "takenById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAttendanceRecord" (
    "id" TEXT NOT NULL,
    "attendanceSessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "remarks" TEXT,
    "markedById" TEXT,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AssessmentType" NOT NULL,
    "maxMarks" DECIMAL(6,2) NOT NULL,
    "weightPercent" DECIMAL(5,2),
    "assessmentDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "intakeId" TEXT NOT NULL,
    "unitAssignmentId" TEXT NOT NULL,
    "lecturerAllocationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultSubmission" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "status" "ResultWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "submittedToCoordinatorAt" TIMESTAMP(3),
    "coordinatorReviewedById" TEXT,
    "coordinatorReviewedAt" TIMESTAMP(3),
    "coordinatorComment" TEXT,
    "submittedToAcademicDirectorAt" TIMESTAMP(3),
    "academicReviewedById" TEXT,
    "academicReviewedAt" TIMESTAMP(3),
    "academicComment" TEXT,
    "finalApprovedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAssessmentResult" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "studentId" TEXT,
    "studentProfileId" TEXT,
    "marks" DECIMAL(6,2),
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "isExempted" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "enteredById" TEXT NOT NULL,
    "lastEditedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultWorkflowHistory" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "action" "ResultWorkflowAction" NOT NULL,
    "fromStatus" "ResultWorkflowStatus",
    "toStatus" "ResultWorkflowStatus" NOT NULL,
    "performedById" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultWorkflowHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentResultChangeHistory" (
    "id" TEXT NOT NULL,
    "studentResultId" TEXT NOT NULL,
    "previousMarks" DECIMAL(6,2),
    "newMarks" DECIMAL(6,2),
    "previousAbsent" BOOLEAN NOT NULL DEFAULT false,
    "newAbsent" BOOLEAN NOT NULL DEFAULT false,
    "previousExempted" BOOLEAN NOT NULL DEFAULT false,
    "newExempted" BOOLEAN NOT NULL DEFAULT false,
    "previousRemarks" TEXT,
    "newRemarks" TEXT,
    "performedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentResultChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserIdentityProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nationalIdHash" TEXT,
    "nationalIdLast4" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "phone" TEXT,
    "staffNumber" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRecoveryTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "accessCodeHash" TEXT NOT NULL,
    "type" "RecoveryTicketType" NOT NULL,
    "status" "RecoveryTicketStatus" NOT NULL DEFAULT 'SUBMITTED',
    "userId" TEXT,
    "claimantName" TEXT,
    "claimantEmail" TEXT,
    "claimantPhone" TEXT,
    "claimantReference" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "assignedToId" TEXT,
    "identityVerifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "AccountRecoveryTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryTicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderType" "RecoveryMessageSender" NOT NULL,
    "senderUserId" TEXT,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "readByClaimantAt" TIMESTAMP(3),
    "readByStaffAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecoveryTicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountRecoveryToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT,
    "purpose" "RecoveryTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "issuedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRecoveryToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityVerificationAttempt" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "method" "IdentityVerificationMethod" NOT NULL,
    "status" "IdentityVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "identifierHash" TEXT,
    "dateOfBirthMatched" BOOLEAN,
    "emailMatched" BOOLEAN,
    "phoneMatched" BOOLEAN,
    "ipHash" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityVerificationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "actorUserId" TEXT,
    "targetUserId" TEXT,
    "ticketId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffNumberSequence" (
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffNumberSequence_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "studentId" TEXT,
    "senderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCourse_code_key" ON "TrainingCourse"("code");

-- CreateIndex
CREATE INDEX "CourseUnit_courseId_idx" ON "CourseUnit"("courseId");

-- CreateIndex
CREATE INDEX "CourseUnit_isActive_idx" ON "CourseUnit"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CourseUnit_courseId_code_key" ON "CourseUnit"("courseId", "code");

-- CreateIndex
CREATE INDEX "CourseYear_courseId_idx" ON "CourseYear"("courseId");

-- CreateIndex
CREATE INDEX "CourseYear_isActive_idx" ON "CourseYear"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CourseYear_courseId_yearNumber_key" ON "CourseYear"("courseId", "yearNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CourseYear_courseId_sequence_key" ON "CourseYear"("courseId", "sequence");

-- CreateIndex
CREATE INDEX "CourseSemester_courseYearId_idx" ON "CourseSemester"("courseYearId");

-- CreateIndex
CREATE INDEX "CourseSemester_periodType_idx" ON "CourseSemester"("periodType");

-- CreateIndex
CREATE INDEX "CourseSemester_isActive_idx" ON "CourseSemester"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CourseSemester_courseYearId_sequence_key" ON "CourseSemester"("courseYearId", "sequence");

-- CreateIndex
CREATE INDEX "SemesterUnitAssignment_intakeId_idx" ON "SemesterUnitAssignment"("intakeId");

-- CreateIndex
CREATE INDEX "SemesterUnitAssignment_semesterId_idx" ON "SemesterUnitAssignment"("semesterId");

-- CreateIndex
CREATE INDEX "SemesterUnitAssignment_unitId_idx" ON "SemesterUnitAssignment"("unitId");

-- CreateIndex
CREATE INDEX "SemesterUnitAssignment_status_idx" ON "SemesterUnitAssignment"("status");

-- CreateIndex
CREATE INDEX "SemesterUnitAssignment_intakeId_status_idx" ON "SemesterUnitAssignment"("intakeId", "status");

-- CreateIndex
CREATE INDEX "SemesterUnitAssignment_createdById_idx" ON "SemesterUnitAssignment"("createdById");

-- CreateIndex
CREATE INDEX "SemesterUnitAssignment_submittedById_idx" ON "SemesterUnitAssignment"("submittedById");

-- CreateIndex
CREATE INDEX "SemesterUnitAssignment_reviewedById_idx" ON "SemesterUnitAssignment"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "SemesterUnitAssignment_intakeId_unitId_key" ON "SemesterUnitAssignment"("intakeId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "SemesterUnitAssignment_intakeId_semesterId_unitId_key" ON "SemesterUnitAssignment"("intakeId", "semesterId", "unitId");

-- CreateIndex
CREATE INDEX "CourseCoordinatorAssignment_courseId_idx" ON "CourseCoordinatorAssignment"("courseId");

-- CreateIndex
CREATE INDEX "CourseCoordinatorAssignment_userId_idx" ON "CourseCoordinatorAssignment"("userId");

-- CreateIndex
CREATE INDEX "CourseCoordinatorAssignment_assignedById_idx" ON "CourseCoordinatorAssignment"("assignedById");

-- CreateIndex
CREATE INDEX "CourseCoordinatorAssignment_isActive_idx" ON "CourseCoordinatorAssignment"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CourseCoordinatorAssignment_courseId_userId_key" ON "CourseCoordinatorAssignment"("courseId", "userId");

-- CreateIndex
CREATE INDEX "IntakeCoordinatorAssignment_intakeId_idx" ON "IntakeCoordinatorAssignment"("intakeId");

-- CreateIndex
CREATE INDEX "IntakeCoordinatorAssignment_coordinatorId_idx" ON "IntakeCoordinatorAssignment"("coordinatorId");

-- CreateIndex
CREATE INDEX "IntakeCoordinatorAssignment_assignedById_idx" ON "IntakeCoordinatorAssignment"("assignedById");

-- CreateIndex
CREATE INDEX "IntakeCoordinatorAssignment_isActive_idx" ON "IntakeCoordinatorAssignment"("isActive");

-- CreateIndex
CREATE INDEX "IntakeCoordinatorAssignment_intakeId_isActive_idx" ON "IntakeCoordinatorAssignment"("intakeId", "isActive");

-- CreateIndex
CREATE INDEX "IntakeCoordinatorAssignment_coordinatorId_isActive_idx" ON "IntakeCoordinatorAssignment"("coordinatorId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Intake_code_key" ON "Intake"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_admissionNumber_key" ON "StudentProfile"("admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_admissionNumber_key" ON "Student"("admissionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Student_nationalId_key" ON "Student"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_courseCode_idx" ON "Student"("courseCode");

-- CreateIndex
CREATE INDEX "Student_intakeId_idx" ON "Student"("intakeId");

-- CreateIndex
CREATE INDEX "LecturerUnitAllocation_intakeId_idx" ON "LecturerUnitAllocation"("intakeId");

-- CreateIndex
CREATE INDEX "LecturerUnitAllocation_unitAssignmentId_idx" ON "LecturerUnitAllocation"("unitAssignmentId");

-- CreateIndex
CREATE INDEX "LecturerUnitAllocation_lecturerId_idx" ON "LecturerUnitAllocation"("lecturerId");

-- CreateIndex
CREATE INDEX "LecturerUnitAllocation_allocatedById_idx" ON "LecturerUnitAllocation"("allocatedById");

-- CreateIndex
CREATE INDEX "LecturerUnitAllocation_endedById_idx" ON "LecturerUnitAllocation"("endedById");

-- CreateIndex
CREATE INDEX "LecturerUnitAllocation_isActive_idx" ON "LecturerUnitAllocation"("isActive");

-- CreateIndex
CREATE INDEX "LecturerUnitAllocation_intakeId_unitAssignmentId_isActive_idx" ON "LecturerUnitAllocation"("intakeId", "unitAssignmentId", "isActive");

-- CreateIndex
CREATE INDEX "LecturerUnitAllocation_lecturerId_isActive_idx" ON "LecturerUnitAllocation"("lecturerId", "isActive");

-- CreateIndex
CREATE INDEX "TimetableEntry_intakeId_idx" ON "TimetableEntry"("intakeId");

-- CreateIndex
CREATE INDEX "TimetableEntry_unitAssignmentId_idx" ON "TimetableEntry"("unitAssignmentId");

-- CreateIndex
CREATE INDEX "TimetableEntry_lecturerAllocationId_idx" ON "TimetableEntry"("lecturerAllocationId");

-- CreateIndex
CREATE INDEX "TimetableEntry_lecturerId_idx" ON "TimetableEntry"("lecturerId");

-- CreateIndex
CREATE INDEX "TimetableEntry_dayOfWeek_idx" ON "TimetableEntry"("dayOfWeek");

-- CreateIndex
CREATE INDEX "TimetableEntry_isActive_idx" ON "TimetableEntry"("isActive");

-- CreateIndex
CREATE INDEX "TimetableEntry_intakeId_dayOfWeek_isActive_idx" ON "TimetableEntry"("intakeId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "TimetableEntry_lecturerId_dayOfWeek_isActive_idx" ON "TimetableEntry"("lecturerId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "TimetableEntry_room_dayOfWeek_isActive_idx" ON "TimetableEntry"("room", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "AttendanceSession_intakeId_idx" ON "AttendanceSession"("intakeId");

-- CreateIndex
CREATE INDEX "AttendanceSession_timetableEntryId_idx" ON "AttendanceSession"("timetableEntryId");

-- CreateIndex
CREATE INDEX "AttendanceSession_sessionDate_idx" ON "AttendanceSession"("sessionDate");

-- CreateIndex
CREATE INDEX "AttendanceSession_dayOfWeek_idx" ON "AttendanceSession"("dayOfWeek");

-- CreateIndex
CREATE INDEX "AttendanceSession_takenById_idx" ON "AttendanceSession"("takenById");

-- CreateIndex
CREATE INDEX "AttendanceSession_intakeId_sessionDate_idx" ON "AttendanceSession"("intakeId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_timetableEntryId_sessionDate_key" ON "AttendanceSession"("timetableEntryId", "sessionDate");

-- CreateIndex
CREATE INDEX "StudentAttendanceRecord_attendanceSessionId_idx" ON "StudentAttendanceRecord"("attendanceSessionId");

-- CreateIndex
CREATE INDEX "StudentAttendanceRecord_studentId_idx" ON "StudentAttendanceRecord"("studentId");

-- CreateIndex
CREATE INDEX "StudentAttendanceRecord_status_idx" ON "StudentAttendanceRecord"("status");

-- CreateIndex
CREATE INDEX "StudentAttendanceRecord_markedById_idx" ON "StudentAttendanceRecord"("markedById");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAttendanceRecord_attendanceSessionId_studentId_key" ON "StudentAttendanceRecord"("attendanceSessionId", "studentId");

-- CreateIndex
CREATE INDEX "Assessment_intakeId_idx" ON "Assessment"("intakeId");

-- CreateIndex
CREATE INDEX "Assessment_unitAssignmentId_idx" ON "Assessment"("unitAssignmentId");

-- CreateIndex
CREATE INDEX "Assessment_lecturerAllocationId_idx" ON "Assessment"("lecturerAllocationId");

-- CreateIndex
CREATE INDEX "Assessment_createdById_idx" ON "Assessment"("createdById");

-- CreateIndex
CREATE INDEX "Assessment_type_idx" ON "Assessment"("type");

-- CreateIndex
CREATE INDEX "Assessment_isActive_idx" ON "Assessment"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_intakeId_unitAssignmentId_code_key" ON "Assessment"("intakeId", "unitAssignmentId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ResultSubmission_assessmentId_key" ON "ResultSubmission"("assessmentId");

-- CreateIndex
CREATE INDEX "ResultSubmission_status_idx" ON "ResultSubmission"("status");

-- CreateIndex
CREATE INDEX "ResultSubmission_createdById_idx" ON "ResultSubmission"("createdById");

-- CreateIndex
CREATE INDEX "ResultSubmission_coordinatorReviewedById_idx" ON "ResultSubmission"("coordinatorReviewedById");

-- CreateIndex
CREATE INDEX "ResultSubmission_academicReviewedById_idx" ON "ResultSubmission"("academicReviewedById");

-- CreateIndex
CREATE INDEX "ResultSubmission_publishedById_idx" ON "ResultSubmission"("publishedById");

-- CreateIndex
CREATE INDEX "StudentAssessmentResult_submissionId_idx" ON "StudentAssessmentResult"("submissionId");

-- CreateIndex
CREATE INDEX "StudentAssessmentResult_studentId_idx" ON "StudentAssessmentResult"("studentId");

-- CreateIndex
CREATE INDEX "StudentAssessmentResult_studentProfileId_idx" ON "StudentAssessmentResult"("studentProfileId");

-- CreateIndex
CREATE INDEX "StudentAssessmentResult_enteredById_idx" ON "StudentAssessmentResult"("enteredById");

-- CreateIndex
CREATE INDEX "StudentAssessmentResult_lastEditedById_idx" ON "StudentAssessmentResult"("lastEditedById");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAssessmentResult_submissionId_studentId_key" ON "StudentAssessmentResult"("submissionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAssessmentResult_submissionId_studentProfileId_key" ON "StudentAssessmentResult"("submissionId", "studentProfileId");

-- CreateIndex
CREATE INDEX "ResultWorkflowHistory_submissionId_idx" ON "ResultWorkflowHistory"("submissionId");

-- CreateIndex
CREATE INDEX "ResultWorkflowHistory_performedById_idx" ON "ResultWorkflowHistory"("performedById");

-- CreateIndex
CREATE INDEX "ResultWorkflowHistory_action_idx" ON "ResultWorkflowHistory"("action");

-- CreateIndex
CREATE INDEX "ResultWorkflowHistory_toStatus_idx" ON "ResultWorkflowHistory"("toStatus");

-- CreateIndex
CREATE INDEX "ResultWorkflowHistory_submissionId_createdAt_idx" ON "ResultWorkflowHistory"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentResultChangeHistory_studentResultId_idx" ON "StudentResultChangeHistory"("studentResultId");

-- CreateIndex
CREATE INDEX "StudentResultChangeHistory_performedById_idx" ON "StudentResultChangeHistory"("performedById");

-- CreateIndex
CREATE INDEX "StudentResultChangeHistory_createdAt_idx" ON "StudentResultChangeHistory"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentityProfile_userId_key" ON "UserIdentityProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentityProfile_nationalIdHash_key" ON "UserIdentityProfile"("nationalIdHash");

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentityProfile_staffNumber_key" ON "UserIdentityProfile"("staffNumber");

-- CreateIndex
CREATE INDEX "UserIdentityProfile_phone_idx" ON "UserIdentityProfile"("phone");

-- CreateIndex
CREATE INDEX "UserIdentityProfile_dateOfBirth_idx" ON "UserIdentityProfile"("dateOfBirth");

-- CreateIndex
CREATE UNIQUE INDEX "AccountRecoveryTicket_ticketNumber_key" ON "AccountRecoveryTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "AccountRecoveryTicket_status_idx" ON "AccountRecoveryTicket"("status");

-- CreateIndex
CREATE INDEX "AccountRecoveryTicket_type_idx" ON "AccountRecoveryTicket"("type");

-- CreateIndex
CREATE INDEX "AccountRecoveryTicket_userId_idx" ON "AccountRecoveryTicket"("userId");

-- CreateIndex
CREATE INDEX "AccountRecoveryTicket_assignedToId_idx" ON "AccountRecoveryTicket"("assignedToId");

-- CreateIndex
CREATE INDEX "AccountRecoveryTicket_createdAt_idx" ON "AccountRecoveryTicket"("createdAt");

-- CreateIndex
CREATE INDEX "AccountRecoveryTicket_lastActivityAt_idx" ON "AccountRecoveryTicket"("lastActivityAt");

-- CreateIndex
CREATE INDEX "RecoveryTicketMessage_ticketId_createdAt_idx" ON "RecoveryTicketMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "RecoveryTicketMessage_senderUserId_idx" ON "RecoveryTicketMessage"("senderUserId");

-- CreateIndex
CREATE INDEX "RecoveryTicketMessage_isInternal_idx" ON "RecoveryTicketMessage"("isInternal");

-- CreateIndex
CREATE UNIQUE INDEX "AccountRecoveryToken_tokenHash_key" ON "AccountRecoveryToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountRecoveryToken_userId_purpose_idx" ON "AccountRecoveryToken"("userId", "purpose");

-- CreateIndex
CREATE INDEX "AccountRecoveryToken_ticketId_idx" ON "AccountRecoveryToken"("ticketId");

-- CreateIndex
CREATE INDEX "AccountRecoveryToken_expiresAt_idx" ON "AccountRecoveryToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AccountRecoveryToken_usedAt_idx" ON "AccountRecoveryToken"("usedAt");

-- CreateIndex
CREATE INDEX "IdentityVerificationAttempt_ticketId_createdAt_idx" ON "IdentityVerificationAttempt"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "IdentityVerificationAttempt_status_idx" ON "IdentityVerificationAttempt"("status");

-- CreateIndex
CREATE INDEX "IdentityVerificationAttempt_method_idx" ON "IdentityVerificationAttempt"("method");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_action_idx" ON "SecurityAuditLog"("action");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_outcome_idx" ON "SecurityAuditLog"("outcome");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_actorUserId_idx" ON "SecurityAuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_targetUserId_idx" ON "SecurityAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_ticketId_idx" ON "SecurityAuditLog"("ticketId");

-- CreateIndex
CREATE INDEX "SecurityAuditLog_createdAt_idx" ON "SecurityAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_studentId_idx" ON "Notification"("studentId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseUnit" ADD CONSTRAINT "CourseUnit_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseYear" ADD CONSTRAINT "CourseYear_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseSemester" ADD CONSTRAINT "CourseSemester_courseYearId_fkey" FOREIGN KEY ("courseYearId") REFERENCES "CourseYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemesterUnitAssignment" ADD CONSTRAINT "SemesterUnitAssignment_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemesterUnitAssignment" ADD CONSTRAINT "SemesterUnitAssignment_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "CourseSemester"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemesterUnitAssignment" ADD CONSTRAINT "SemesterUnitAssignment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "CourseUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemesterUnitAssignment" ADD CONSTRAINT "SemesterUnitAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemesterUnitAssignment" ADD CONSTRAINT "SemesterUnitAssignment_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemesterUnitAssignment" ADD CONSTRAINT "SemesterUnitAssignment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCoordinatorAssignment" ADD CONSTRAINT "CourseCoordinatorAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCoordinatorAssignment" ADD CONSTRAINT "CourseCoordinatorAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseCoordinatorAssignment" ADD CONSTRAINT "CourseCoordinatorAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeCoordinatorAssignment" ADD CONSTRAINT "IntakeCoordinatorAssignment_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeCoordinatorAssignment" ADD CONSTRAINT "IntakeCoordinatorAssignment_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeCoordinatorAssignment" ADD CONSTRAINT "IntakeCoordinatorAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intake" ADD CONSTRAINT "Intake_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerUnitAllocation" ADD CONSTRAINT "LecturerUnitAllocation_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerUnitAllocation" ADD CONSTRAINT "LecturerUnitAllocation_unitAssignmentId_fkey" FOREIGN KEY ("unitAssignmentId") REFERENCES "SemesterUnitAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerUnitAllocation" ADD CONSTRAINT "LecturerUnitAllocation_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerUnitAllocation" ADD CONSTRAINT "LecturerUnitAllocation_allocatedById_fkey" FOREIGN KEY ("allocatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturerUnitAllocation" ADD CONSTRAINT "LecturerUnitAllocation_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_unitAssignmentId_fkey" FOREIGN KEY ("unitAssignmentId") REFERENCES "SemesterUnitAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_lecturerAllocationId_fkey" FOREIGN KEY ("lecturerAllocationId") REFERENCES "LecturerUnitAllocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_timetableEntryId_fkey" FOREIGN KEY ("timetableEntryId") REFERENCES "TimetableEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_takenById_fkey" FOREIGN KEY ("takenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendanceRecord" ADD CONSTRAINT "StudentAttendanceRecord_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendanceRecord" ADD CONSTRAINT "StudentAttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAttendanceRecord" ADD CONSTRAINT "StudentAttendanceRecord_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "Intake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_unitAssignmentId_fkey" FOREIGN KEY ("unitAssignmentId") REFERENCES "SemesterUnitAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_lecturerAllocationId_fkey" FOREIGN KEY ("lecturerAllocationId") REFERENCES "LecturerUnitAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSubmission" ADD CONSTRAINT "ResultSubmission_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSubmission" ADD CONSTRAINT "ResultSubmission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSubmission" ADD CONSTRAINT "ResultSubmission_coordinatorReviewedById_fkey" FOREIGN KEY ("coordinatorReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSubmission" ADD CONSTRAINT "ResultSubmission_academicReviewedById_fkey" FOREIGN KEY ("academicReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultSubmission" ADD CONSTRAINT "ResultSubmission_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssessmentResult" ADD CONSTRAINT "StudentAssessmentResult_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ResultSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssessmentResult" ADD CONSTRAINT "StudentAssessmentResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssessmentResult" ADD CONSTRAINT "StudentAssessmentResult_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssessmentResult" ADD CONSTRAINT "StudentAssessmentResult_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAssessmentResult" ADD CONSTRAINT "StudentAssessmentResult_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultWorkflowHistory" ADD CONSTRAINT "ResultWorkflowHistory_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ResultSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultWorkflowHistory" ADD CONSTRAINT "ResultWorkflowHistory_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResultChangeHistory" ADD CONSTRAINT "StudentResultChangeHistory_studentResultId_fkey" FOREIGN KEY ("studentResultId") REFERENCES "StudentAssessmentResult"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentResultChangeHistory" ADD CONSTRAINT "StudentResultChangeHistory_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserIdentityProfile" ADD CONSTRAINT "UserIdentityProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecoveryTicket" ADD CONSTRAINT "AccountRecoveryTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecoveryTicket" ADD CONSTRAINT "AccountRecoveryTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecoveryTicket" ADD CONSTRAINT "AccountRecoveryTicket_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecoveryTicket" ADD CONSTRAINT "AccountRecoveryTicket_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryTicketMessage" ADD CONSTRAINT "RecoveryTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "AccountRecoveryTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryTicketMessage" ADD CONSTRAINT "RecoveryTicketMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecoveryToken" ADD CONSTRAINT "AccountRecoveryToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecoveryToken" ADD CONSTRAINT "AccountRecoveryToken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "AccountRecoveryTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountRecoveryToken" ADD CONSTRAINT "AccountRecoveryToken_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerificationAttempt" ADD CONSTRAINT "IdentityVerificationAttempt_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "AccountRecoveryTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAuditLog" ADD CONSTRAINT "SecurityAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAuditLog" ADD CONSTRAINT "SecurityAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityAuditLog" ADD CONSTRAINT "SecurityAuditLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "AccountRecoveryTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
