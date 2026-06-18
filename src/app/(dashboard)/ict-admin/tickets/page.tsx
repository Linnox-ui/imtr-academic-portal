import { redirect } from "next/navigation";

import {
  RecoveryMessageSender,
  RecoveryTicketStatus,
} from "@prisma/client";

import { IctRecoveryTicketInbox } from "./ict-recovery-ticket-inbox";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IctRecoveryTicketsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
      accountStatus: true,
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
    currentUser.accountStatus !== "ACTIVE" ||
    !["ict_admin", "super_admin"].includes(currentUser.role.name)
  ) {
    redirect("/unauthorized");
  }

  const tickets = await prisma.accountRecoveryTicket.findMany({
    take: 250,
    orderBy: [
      {
        lastActivityAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
    select: {
      id: true,
      ticketNumber: true,
      type: true,
      status: true,
      subject: true,
      description: true,
      claimantName: true,
      claimantEmail: true,
      claimantPhone: true,
      claimantReference: true,
      identityVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
      lastActivityAt: true,
      resolvedAt: true,
      closedAt: true,

      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          isActive: true,
          accountStatus: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      },

      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      },

      _count: {
        select: {
          messages: {
            where: {
              senderType: RecoveryMessageSender.CLAIMANT,
              readByStaffAt: null,
            },
          },
          verificationAttempts: true,
        },
      },
    },
  });

  const openStatuses = new Set<RecoveryTicketStatus>([
    RecoveryTicketStatus.SUBMITTED,
    RecoveryTicketStatus.IDENTITY_REVIEW,
    RecoveryTicketStatus.MORE_INFORMATION_REQUIRED,
    RecoveryTicketStatus.VERIFIED,
    RecoveryTicketStatus.RESET_AUTHORIZED,
  ]);

  const summary = {
    total: tickets.length,

    open: tickets.filter((ticket) =>
      openStatuses.has(ticket.status),
    ).length,

    unassigned: tickets.filter(
      (ticket) =>
        openStatuses.has(ticket.status) &&
        !ticket.assignedTo,
    ).length,

    assignedToMe: tickets.filter(
      (ticket) =>
        openStatuses.has(ticket.status) &&
        ticket.assignedTo?.id === currentUser.id,
    ).length,

    awaitingClaimant: tickets.filter(
      (ticket) =>
        ticket.status ===
        RecoveryTicketStatus.MORE_INFORMATION_REQUIRED,
    ).length,

    verified: tickets.filter(
      (ticket) =>
        ticket.status === RecoveryTicketStatus.VERIFIED ||
        ticket.status === RecoveryTicketStatus.RESET_AUTHORIZED,
    ).length,

    completed: tickets.filter(
      (ticket) =>
        ticket.status === RecoveryTicketStatus.RESOLVED ||
        ticket.status === RecoveryTicketStatus.REJECTED ||
        ticket.status === RecoveryTicketStatus.CLOSED,
    ).length,

    unreadClaimantMessages: tickets.reduce(
      (total, ticket) =>
        total + ticket._count.messages,
      0,
    ),
  };

  return (
    <IctRecoveryTicketInbox
      currentUser={{
        id: currentUser.id,
        name: `${currentUser.firstName} ${currentUser.lastName}`,
        email: currentUser.email,
        role: currentUser.role.name,
      }}
      summary={summary}
      tickets={tickets.map((ticket) => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        type: ticket.type,
        status: ticket.status,
        subject: ticket.subject,
        description: ticket.description,
        claimantName: ticket.claimantName,
        claimantEmail: ticket.claimantEmail,
        claimantPhone: ticket.claimantPhone,
        claimantReference: ticket.claimantReference,
        identityVerifiedAt:
          ticket.identityVerifiedAt?.toISOString() ?? null,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        lastActivityAt: ticket.lastActivityAt.toISOString(),
        resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
        closedAt: ticket.closedAt?.toISOString() ?? null,

        user: ticket.user
          ? {
              id: ticket.user.id,
              email: ticket.user.email,
              firstName: ticket.user.firstName,
              lastName: ticket.user.lastName,
              isActive: ticket.user.isActive,
              accountStatus: ticket.user.accountStatus,
              role: ticket.user.role.name,
            }
          : null,

        assignedTo: ticket.assignedTo
          ? {
              id: ticket.assignedTo.id,
              name: `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`,
              email: ticket.assignedTo.email,
              role: ticket.assignedTo.role.name,
            }
          : null,

        unreadClaimantMessages: ticket._count.messages,
        verificationAttemptCount:
          ticket._count.verificationAttempts,
      }))}
    />
  );
}
