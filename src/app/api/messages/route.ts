import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/messages - List all conversations for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";

    // Get conversations where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
        ...(search && {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            {
              participants: {
                some: {
                  user: {
                    OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      { firstName: { contains: search, mode: "insensitive" } },
                      { lastName: { contains: search, mode: "insensitive" } },
                    ],
                  },
                },
              },
            },
          ],
        }),
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Format conversations with unread count
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Get participant's last read time
        const participant = conv.participants.find((p) => p.userId === userId);
        const lastReadAt = participant?.lastReadAt || new Date(0);

        // Count unread messages
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            createdAt: { gt: lastReadAt },
            createdById: { not: userId },
          },
        });

        // Get other participants (exclude current user)
        const otherParticipants = conv.participants
          .filter((p) => p.userId !== userId)
          .map((p) => ({
            id: p.user.id,
            name: p.user.name || `${p.user.firstName || ""} ${p.user.lastName || ""}`.trim(),
            email: p.user.email,
            image: p.user.image,
            role: p.user.role,
          }));

        // Generate conversation title
        let title = conv.title;
        if (!title) {
          if (otherParticipants.length === 1) {
            title = otherParticipants[0].name;
          } else if (otherParticipants.length > 1) {
            title = otherParticipants.map((p) => p.name.split(" ")[0]).join(", ");
          } else {
            title = "Conversation";
          }
        }

        const lastMessage = conv.messages[0];

        return {
          id: conv.id,
          title,
          participants: otherParticipants,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                createdBy: {
                  id: lastMessage.createdBy.id,
                  name:
                    lastMessage.createdBy.name ||
                    `${lastMessage.createdBy.firstName || ""} ${lastMessage.createdBy.lastName || ""}`.trim(),
                },
                isOwn: lastMessage.createdById === userId,
              }
            : null,
          unreadCount,
          updatedAt: conv.updatedAt,
        };
      })
    );

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des conversations" },
      { status: 500 }
    );
  }
}

// POST /api/messages - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { participantIds, title, initialMessage } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: "Au moins un participant est requis" },
        { status: 400 }
      );
    }

    // Get current user's student profile if exists
    const student = await prisma.student.findUnique({
      where: { userId },
    });

    // Check if conversation already exists with same participants
    const allParticipantIds = [...new Set([userId, ...participantIds])];

    const existingConversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          {
            participants: {
              every: {
                userId: { in: allParticipantIds },
              },
            },
          },
          {
            participants: {
              none: {
                userId: { notIn: allParticipantIds },
              },
            },
          },
        ],
      },
      include: {
        participants: true,
      },
    });

    // If conversation exists with exact same participants, return it
    if (existingConversation && existingConversation.participants.length === allParticipantIds.length) {
      return NextResponse.json({
        conversation: { id: existingConversation.id },
        existing: true,
      });
    }

    // Create new conversation
    const conversation = await prisma.$transaction(async (tx) => {
      const conv = await tx.conversation.create({
        data: {
          title: title || null,
          studentId: student?.id || null,
          participants: {
            create: allParticipantIds.map((pId) => ({
              userId: pId,
              lastReadAt: pId === userId ? new Date() : null,
            })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  image: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      // Create initial message if provided
      if (initialMessage && initialMessage.trim()) {
        await tx.message.create({
          data: {
            conversationId: conv.id,
            createdById: userId,
            content: initialMessage.trim(),
          },
        });

        // Update conversation timestamp
        await tx.conversation.update({
          where: { id: conv.id },
          data: { updatedAt: new Date() },
        });
      }

      return conv;
    });

    // Create notification for other participants
    const otherParticipants = participantIds.filter((id: string) => id !== userId);
    if (otherParticipants.length > 0) {
      await prisma.notification.createMany({
        data: otherParticipants.map((participantId: string) => ({
          userId: participantId,
          type: "NEW_MESSAGE",
          title: "Nouvelle conversation",
          message: `${session.user.name || session.user.email} a démarré une conversation avec vous`,
          link: `/messages?id=${conversation.id}`,
        })),
      });
    }

    return NextResponse.json({ conversation: { id: conversation.id } }, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la conversation" },
      { status: 500 }
    );
  }
}
