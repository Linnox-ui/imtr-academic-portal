"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dispatchNotification } from "@/lib/notifications";

export async function sendClassAnnouncement(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const intakeId = String(formData.get("intakeId") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const sendEmailCopy = formData.get("sendEmailCopy") === "on";

  if (!intakeId || !subject || !message) {
    redirect(
      `/lecturer/communications?error=${encodeURIComponent("All fields are required.")}`,
    );
  }

  // 1. Verify the lecturer actually teaches this intake
  const validAllocation = await prisma.lecturerUnitAllocation.findFirst({
    where: {
      lecturerId: session.user.id,
      intakeId: intakeId,
      isActive: true,
    },
  });

  if (!validAllocation) {
    redirect(
      `/lecturer/communications?error=${encodeURIComponent("You are not authorized to message this class.")}`,
    );
  }

  // 2. Get all active students in this specific intake
  const students = await prisma.student.findMany({
    where: { intakeId: intakeId, status: "ACTIVE" },
    select: { id: true, email: true },
  });

  if (students.length === 0) {
    redirect(
      `/lecturer/communications?error=${encodeURIComponent("No active students found in this class to message.")}`,
    );
  }

  const lecturer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { firstName: true, lastName: true },
  });

  const senderName =
    [lecturer?.firstName, lecturer?.lastName].filter(Boolean).join(" ") ||
    "Your Lecturer";

  // 3. Dispatch notifications to all students in the intake
  const dispatchPromises = students.map((student) =>
    dispatchNotification({
      studentId: student.id,
      senderId: session.user.id,
      title: `Notice from ${senderName}: ${subject}`,
      message: message,
      sendEmail: sendEmailCopy,
      emailAddress: student.email,
    }),
  );

  await Promise.all(dispatchPromises);

  revalidatePath("/lecturer/communications");
  redirect(
    `/lecturer/communications?success=${encodeURIComponent(`Announcement sent successfully to ${students.length} students.`)}`,
  );
}
