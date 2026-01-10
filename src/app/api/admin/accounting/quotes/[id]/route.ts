import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/accounting/quotes/[id] - Detail d'un devis
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            packs: {
              include: {
                pack: { select: { displayName: true, price: true } },
              },
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
        paymentSchedules: {
          orderBy: { dueDate: "asc" },
          include: {
            payments: {
              orderBy: { paymentDate: "desc" },
            },
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Devis non trouve" }, { status: 404 });
    }

    // Calculer les totaux
    const totalPaid = quote.paymentSchedules.reduce(
      (sum, s) => sum + s.paidAmount,
      0
    );
    const remaining = quote.totalAmount - totalPaid;

    return NextResponse.json({
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        totalAmount: quote.totalAmount,
        currency: quote.currency,
        paymentCurrency: quote.paymentCurrency,
        status: quote.status,
        sentAt: quote.sentAt,
        validatedAt: quote.validatedAt,
        rejectedAt: quote.rejectedAt,
        expiresAt: quote.expiresAt,
        notes: quote.notes,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt,
        student: {
          id: quote.student.id,
          userId: quote.student.userId,
          name:
            quote.student.user.firstName && quote.student.user.lastName
              ? `${quote.student.user.firstName} ${quote.student.user.lastName}`
              : quote.student.user.name,
          email: quote.student.user.email,
          phone: quote.student.user.phone,
        },
        items: quote.items.map((item) => ({
          id: item.id,
          amount: item.amount,
          description: item.description,
          packName: item.studentPack.pack.displayName,
        })),
        schedules: quote.paymentSchedules.map((s) => ({
          id: s.id,
          amount: s.amount,
          currency: s.currency,
          actualCurrency: s.actualCurrency,
          exchangeRate: s.exchangeRate,
          dueDate: s.dueDate,
          status: s.status,
          paidAmount: s.paidAmount,
          paidDate: s.paidDate,
          payments: s.payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            currency: p.currency,
            paymentDate: p.paymentDate,
            status: p.status,
          })),
        })),
        summary: {
          totalPaid,
          remaining,
          percentPaid: Math.round((totalPaid / quote.totalAmount) * 100),
          scheduleCount: quote.paymentSchedules.length,
          paidSchedules: quote.paymentSchedules.filter((s) => s.status === "PAID")
            .length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du devis" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/accounting/quotes/[id] - Modifier un devis
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const existingQuote = await prisma.quote.findUnique({
      where: { id },
    });

    if (!existingQuote) {
      return NextResponse.json({ error: "Devis non trouve" }, { status: 404 });
    }

    // On ne peut modifier que les devis en brouillon ou envoyes
    if (!["DRAFT", "SENT"].includes(existingQuote.status)) {
      return NextResponse.json(
        { error: "Ce devis ne peut plus etre modifie" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, paymentCurrency, notes, expiresAt } = body;

    const updateData: Record<string, unknown> = {};

    if (paymentCurrency !== undefined) {
      updateData.paymentCurrency = paymentCurrency;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    // Gestion des changements de statut
    if (status && status !== existingQuote.status) {
      if (status === "SENT" && existingQuote.status === "DRAFT") {
        updateData.status = "SENT";
        updateData.sentAt = new Date();
      } else if (status === "VALIDATED" && existingQuote.status === "SENT") {
        updateData.status = "VALIDATED";
        updateData.validatedAt = new Date();
      } else if (status === "REJECTED" && existingQuote.status === "SENT") {
        updateData.status = "REJECTED";
        updateData.rejectedAt = new Date();
      } else {
        return NextResponse.json(
          { error: "Transition de statut invalide" },
          { status: 400 }
        );
      }
    }

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        student: {
          include: {
            user: {
              select: { name: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_QUOTE",
        resourceType: "Quote",
        resourceId: id,
        metadata: {
          changes: body,
          previousStatus: existingQuote.status,
          newStatus: updatedQuote.status,
        },
      },
    });

    return NextResponse.json({
      quote: {
        id: updatedQuote.id,
        quoteNumber: updatedQuote.quoteNumber,
        status: updatedQuote.status,
        paymentCurrency: updatedQuote.paymentCurrency,
        sentAt: updatedQuote.sentAt,
        validatedAt: updatedQuote.validatedAt,
      },
      message: "Devis mis a jour avec succes",
    });
  } catch (error) {
    console.error("Error updating quote:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour du devis" },
      { status: 500 }
    );
  }
}
