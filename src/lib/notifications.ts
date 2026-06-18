import { prisma } from "@/lib/prisma";

type NotificationPayload = {
  title: string;
  message: string;
  actionUrl?: string;
  studentId?: string;
  userId?: string;
  senderId?: string;
  sendEmail?: boolean;
  emailAddress?: string | null;
};

/**
 * Core service to dispatch notifications.
 * Currently writes to the DB for in-app alerts.
 * Designed to easily drop in an email provider (like Resend or SendGrid) later.
 */
export async function dispatchNotification(payload: NotificationPayload) {
  // 1. Save the in-app notification to the database
  await prisma.notification.create({
    data: {
      title: payload.title,
      message: payload.message,
      actionUrl: payload.actionUrl,
      studentId: payload.studentId,
      userId: payload.userId,
      senderId: payload.senderId,
    },
  });

  // 2. Future-proof Email Hook
  if (payload.sendEmail && payload.emailAddress) {
    // TODO: Plug in email provider here when ready to go live.
    // e.g., await resend.emails.send({ to: payload.emailAddress, subject: payload.title, html: payload.message });
    console.log(
      `[EMAIL STUB] Would send email to: ${payload.emailAddress} | Subject: ${payload.title}`,
    );
  }
}
