import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { generateQuoteNumber } from "@/lib/accounting";

// GET /api/admin/accounting/quotes - Liste des devis
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const studentId = searchParams.get("studentId");

    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        items: {
          include: {
            studentPack: {
              include: {
                pack: {
                  select: { displayName: true },
                },
              },
            },
          },
        },
        paymentSchedules: {
          orderBy: { dueDate: "asc" },
        },
      },
    });

    // Calculer les statistiques
    const stats = {
      total: quotes.length,
      draft: quotes.filter((q) => q.status === "DRAFT").length,
      sent: quotes.filter((q) => q.status === "SENT").length,
      validated: quotes.filter((q) => q.status === "VALIDATED").length,
      totalAmount: quotes
        .filter((q) => q.status === "VALIDATED")
        .reduce((sum, q) => sum + q.totalAmount, 0),
    };

    return NextResponse.json({
      quotes: quotes.map((q) => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        totalAmount: q.totalAmount,
        currency: q.currency,
        paymentCurrency: q.paymentCurrency,
        status: q.status,
        sentAt: q.sentAt,
        validatedAt: q.validatedAt,
        expiresAt: q.expiresAt,
        notes: q.notes,
        createdAt: q.createdAt,
        student: {
          id: q.student.id,
          userId: q.student.userId,
          name:
            q.student.user.firstName && q.student.user.lastName
              ? `${q.student.user.firstName} ${q.student.user.lastName}`
              : q.student.user.name,
          email: q.student.user.email,
        },
        items: q.items.map((item) => ({
          id: item.id,
          amount: item.amount,
          description: item.description,
          packName: item.studentPack.pack.displayName,
        })),
        scheduleCount: q.paymentSchedules.length,
        paidAmount: q.paymentSchedules.reduce((sum, s) => sum + s.paidAmount, 0),
      })),
      stats,
    });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des devis" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/quotes - Creer un devis
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, paymentCurrency, notes, expiresAt } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId est requis" },
        { status: 400 }
      );
    }

    // Verifier que l'etudiant existe et a des packs
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        packs: {
          where: { status: "active" },
          include: {
            pack: {
              select: { displayName: true },
            },
          },
        },
        user: {
          select: { name: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Etudiant non trouve" },
        { status: 404 }
      );
    }

    if (student.packs.length === 0) {
      return NextResponse.json(
        { error: "L'etudiant n'a aucun pack actif" },
        { status: 400 }
      );
    }

    // Verifier qu'il n'y a pas deja un devis valide pour cet etudiant
    const existingValidatedQuote = await prisma.quote.findFirst({
      where: {
        studentId,
        status: "VALIDATED",
      },
    });

    if (existingValidatedQuote) {
      return NextResponse.json(
        { error: "Un devis valide existe deja pour cet etudiant" },
        { status: 400 }
      );
    }

    const quoteNumber = await generateQuoteNumber();

    // Calculer le total depuis les packs
    const totalAmount = student.packs.reduce(
      (sum, sp) => sum + sp.customPrice,
      0
    );

    // Creer le devis avec les items
    const quote = await prisma.quote.create({
      data: {
        studentId,
        quoteNumber,
        totalAmount,
        currency: "EUR", // Toujours EUR pour le contractuel
        paymentCurrency: paymentCurrency || null,
        status: "DRAFT",
        notes: notes || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        items: {
          create: student.packs.map((sp) => ({
            studentPackId: sp.id,
            amount: sp.customPrice,
            description: sp.pack.displayName,
          })),
        },
      },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        items: {
          include: {
            studentPack: {
              include: {
                pack: { select: { displayName: true } },
              },
            },
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_QUOTE",
        resourceType: "Quote",
        resourceId: quote.id,
        metadata: {
          quoteNumber,
          studentId,
          totalAmount,
        },
      },
    });

    return NextResponse.json(
      {
        quote: {
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          totalAmount: quote.totalAmount,
          currency: quote.currency,
          paymentCurrency: quote.paymentCurrency,
          status: quote.status,
          createdAt: quote.createdAt,
          student: {
            id: quote.student.id,
            name:
              quote.student.user.firstName && quote.student.user.lastName
                ? `${quote.student.user.firstName} ${quote.student.user.lastName}`
                : quote.student.user.name,
            email: quote.student.user.email,
          },
          items: quote.items.map((item) => ({
            id: item.id,
            amount: item.amount,
            description: item.description,
            packName: item.studentPack.pack.displayName,
          })),
        },
        message: "Devis cree avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating quote:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation du devis" },
      { status: 500 }
    );
  }
}
