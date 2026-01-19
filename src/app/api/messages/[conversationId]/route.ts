import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/messages/[conversationId] - Get messages in a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { conversationId } = await params;
    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Get conversation with participants
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation non trouvée" }, { status: 404 });
    }

    // Get messages with cursor-based pagination
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor && { createdAt: { lt: new Date(cursor) } }),
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      include: {
        createdBy: {
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
    });

    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, -1) : messages;
    const nextCursor = hasMore
      ? messagesToReturn[messagesToReturn.length - 1]?.createdAt.toISOString()
      : null;

    // Format messages
    const formattedMessages = messagesToReturn.reverse().map((msg) => ({
      id: msg.id,
      content: msg.content,
      attachmentUrl: msg.attachmentUrl,
      createdAt: msg.createdAt,
      isOwn: msg.createdById === userId,
      createdBy: {
        id: msg.createdBy.id,
        name:
          msg.createdBy.name ||
          `${msg.createdBy.firstName || ""} ${msg.createdBy.lastName || ""}`.trim(),
        email: msg.createdBy.email,
        image: msg.createdBy.image,
        role: msg.createdBy.role,
      },
    }));

    // Format participants
    const otherParticipants = conversation.participants
      .filter((p) => p.userId !== userId)
      .map((p) => ({
        id: p.user.id,
        name: p.user.name || `${p.user.firstName || ""} ${p.user.lastName || ""}`.trim(),
        email: p.user.email,
        image: p.user.image,
        role: p.user.role,
      }));

    // Generate title
    let title = conversation.title;
    if (!title) {
      if (otherParticipants.length === 1) {
        title = otherParticipants[0].name;
      } else if (otherParticipants.length > 1) {
        title = otherParticipants.map((p) => p.name.split(" ")[0]).join(", ");
      } else {
        title = "Conversation";
      }
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title,
        participants: otherParticipants,
        studentId: conversation.studentId,
      },
      messages: formattedMessages,
      pagination: {
        hasMore,
        nextCursor,
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des messages" },
      { status: 500 }
    );
  }
}

// POST /api/messages/[conversationId] - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { conversationId } = await params;
    const userId = session.user.id;
    const body = await request.json();
    const { content, attachmentUrl } = body;

    if (!content?.trim() && !attachmentUrl) {
      return NextResponse.json(
        { error: "Le message ne peut pas être vide" },
        { status: 400 }
      );
    }

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Create message and update conversation
    const message = await prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId,
          createdById: userId,
          content: content?.trim() || "",
          attachmentUrl: attachmentUrl || null,
        },
        include: {
          createdBy: {
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
      });

      // Update conversation timestamp
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Update sender's last read time
      await tx.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        data: { lastReadAt: new Date() },
      });

      return msg;
    });

    // Get other participants for notifications
    const otherParticipants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: userId },
      },
    });

    // Create notifications for other participants
    if (otherParticipants.length > 0) {
      const senderName =
        session.user.name ||
        `${(session.user as { firstName?: string }).firstName || ""} ${(session.user as { lastName?: string }).lastName || ""}`.trim() ||
        session.user.email;

      const messagePreview = content ? (content.length > 50 ? content.substring(0, 50) + "..." : content) : "Pièce jointe";

      await prisma.notification.createMany({
        data: otherParticipants.map((p) => ({
          userId: p.userId,
          type: "NEW_MESSAGE",
          title: "💬 Nouveau message",
          message: `${senderName}: ${messagePreview}`,
          data: { conversationId, senderName },
        })),
      });
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        attachmentUrl: message.attachmentUrl,
        createdAt: message.createdAt,
        isOwn: true,
        createdBy: {
          id: message.createdBy.id,
          name:
            message.createdBy.name ||
            `${message.createdBy.firstName || ""} ${message.createdBy.lastName || ""}`.trim(),
          email: message.createdBy.email,
          image: message.createdBy.image,
          role: message.createdBy.role,
        },
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }
}
