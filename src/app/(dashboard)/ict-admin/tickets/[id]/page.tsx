import { redirect } from "next/navigation";

import { RecoveryMessageSender } from "@prisma/client";

import { IctRecoveryTicketManager } from "./ict-recovery-ticket-manager";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type IctRecoveryTicketPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function IctRecoveryTicketPage({
  params,
}: IctRecoveryTicketPageProps) {
  const { id } = await params;

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

  const ticket = await prisma.accountRecoveryTicket.findUnique({
    where: {
      id,
    },
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
      resolutionNote: true,
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
          requiresPasswordChange: true,

          role: {
            select: {
              name: true,
            },
          },

          identityProfile: {
            select: {
              nationalIdLast4: true,
              dateOfBirth: true,
              phone: true,
              staffNumber: true,
              emailVerified: true,
              phoneVerified: true,
            },
          },

          studentProfile: {
            select: {
              admissionNumber: true,
              academicStatus: true,

              intake: {
                select: {
                  code: true,
                  title: true,

                  course: {
                    select: {
                      code: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      },

      assignedTo: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,

          role: {
            select: {
              name: true,
            },
          },
        },
      },

      verifiedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },

      resolvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },

      messages: {
        orderBy: {
          createdAt: "asc",
        },

        select: {
          id: true,
          senderType: true,
          body: true,
          isInternal: true,
          readByClaimantAt: true,
          readByStaffAt: true,
          createdAt: true,
          updatedAt: true,

          senderUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,

              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },

      verificationAttempts: {
        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          method: true,
          status: true,
          dateOfBirthMatched: true,
          emailMatched: true,
          phoneMatched: true,
          failureReason: true,
          createdAt: true,
        },
      },

      auditLogs: {
        take: 30,

        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          action: true,
          outcome: true,
          metadata: true,
          createdAt: true,

          actorUser: {
            select: {
              firstName: true,
              lastName: true,

              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    redirect("/ict-admin/tickets");
  }

  await prisma.recoveryTicketMessage.updateMany({
    where: {
      ticketId: ticket.id,
      senderType: RecoveryMessageSender.CLAIMANT,
      readByStaffAt: null,
    },
    data: {
      readByStaffAt: new Date(),
    },
  });

  return (
    <IctRecoveryTicketManager
      currentUser={{
        id: currentUser.id,
        name: `${currentUser.firstName} ${currentUser.lastName}`,
        email: currentUser.email,
        role: currentUser.role.name,
      }}
      ticket={{
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
        resolutionNote: ticket.resolutionNote,
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
              requiresPasswordChange:
                ticket.user.requiresPasswordChange,
              role: ticket.user.role.name,

              identityProfile: ticket.user.identityProfile
                ? {
                    nationalIdLast4:
                      ticket.user.identityProfile.nationalIdLast4,
                    dateOfBirth:
                      ticket.user.identityProfile.dateOfBirth?.toISOString() ??
                      null,
                    phone: ticket.user.identityProfile.phone,
                    staffNumber:
                      ticket.user.identityProfile.staffNumber,
                    emailVerified:
                      ticket.user.identityProfile.emailVerified,
                    phoneVerified:
                      ticket.user.identityProfile.phoneVerified,
                  }
                : null,

              studentProfile: ticket.user.studentProfile
                ? {
                    admissionNumber:
                      ticket.user.studentProfile.admissionNumber,
                    academicStatus:
                      ticket.user.studentProfile.academicStatus,
                    intake: {
                      code: ticket.user.studentProfile.intake.code,
                      title: ticket.user.studentProfile.intake.title,
                      course: {
                        code:
                          ticket.user.studentProfile.intake.course.code,
                        title:
                          ticket.user.studentProfile.intake.course.title,
                      },
                    },
                  }
                : null,
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

        verifiedBy: ticket.verifiedBy
          ? {
              id: ticket.verifiedBy.id,
              name: `${ticket.verifiedBy.firstName} ${ticket.verifiedBy.lastName}`,
            }
          : null,

        resolvedBy: ticket.resolvedBy
          ? {
              id: ticket.resolvedBy.id,
              name: `${ticket.resolvedBy.firstName} ${ticket.resolvedBy.lastName}`,
            }
          : null,

        messages: ticket.messages.map((message) => ({
          id: message.id,
          senderType: message.senderType,
          body: message.body,
          isInternal: message.isInternal,
          readByClaimantAt:
            message.readByClaimantAt?.toISOString() ?? null,
          readByStaffAt:
            message.readByStaffAt?.toISOString() ?? null,
          createdAt: message.createdAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),

          senderUser: message.senderUser
            ? {
                id: message.senderUser.id,
                name: `${message.senderUser.firstName} ${message.senderUser.lastName}`,
                role: message.senderUser.role.name,
              }
            : null,
        })),

        verificationAttempts: ticket.verificationAttempts.map(
          (attempt) => ({
            id: attempt.id,
            method: attempt.method,
            status: attempt.status,
            dateOfBirthMatched: attempt.dateOfBirthMatched,
            emailMatched: attempt.emailMatched,
            phoneMatched: attempt.phoneMatched,
            failureReason: attempt.failureReason,
            createdAt: attempt.createdAt.toISOString(),
          }),
        ),

        auditLogs: ticket.auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          outcome: log.outcome,
          metadata: log.metadata,
          createdAt: log.createdAt.toISOString(),

          actor: log.actorUser
            ? {
                name: `${log.actorUser.firstName} ${log.actorUser.lastName}`,
                role: log.actorUser.role.name,
              }
            : null,
        })),
      }}
    />
  );
}
