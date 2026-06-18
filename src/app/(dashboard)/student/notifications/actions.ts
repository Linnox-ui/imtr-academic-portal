"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationAsRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  // Audit: Bypass complex relation lookups. Use the primary unique key (email).
  const student = await prisma.student.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });

  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      OR: [
        { userId: session.user.id },
        { studentId: student?.id || "VOID" }, // Match by Registry ID
      ],
    },
    data: { isRead: true },
  });

  revalidatePath("/student/notifications");
}

export async function markAllAsRead() {
  const session = await auth();
  if (!session?.user?.id) return;

  const student = await prisma.student.findUnique({
    where: { email: session.user.email! },
    select: { id: true },
  });

  await prisma.notification.updateMany({
    where: {
      isRead: false,
      OR: [{ userId: session.user.id }, { studentId: student?.id || "VOID" }],
    },
    data: { isRead: true },
  });

  revalidatePath("/student/notifications");
}
