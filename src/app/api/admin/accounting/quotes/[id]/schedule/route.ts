import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// POST /api/admin/accounting/quotes/[id]/schedule - Generer l'echeancier
export async function POST(
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
        student: true,
        paymentSchedules: true,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Devis non trouve" }, { status: 404 });
    }

    // Verifier que le devis est valide
    if (quote.status !== "VALIDATED") {
      return NextResponse.json(
        { error: "Le devis doit etre valide pour generer un echeancier" },
        { status: 400 }
      );
    }

    // Verifier qu'il n'y a pas deja d'echeancier
    if (quote.paymentSchedules.length > 0) {
      return NextResponse.json(
        { error: "Un echeancier existe deja pour ce devis" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { schedules } = body;

    // Validation des echeances
    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json(
        { error: "Au moins une echeance est requise" },
        { status: 400 }
      );
    }

    // Devises supportees
    const SUPPORTED_CURRENCIES = ["EUR", "MAD", "USD"];

    // Valider chaque echeance
    for (const schedule of schedules) {
      if (!schedule.amount || schedule.amount <= 0) {
        return NextResponse.json(
          { error: "Chaque echeance doit avoir un montant positif" },
          { status: 400 }
        );
      }
      if (!schedule.dueDate) {
        return NextResponse.json(
          { error: "Chaque echeance doit avoir une date d'echeance" },
          { status: 400 }
        );
      }
      if (schedule.currency && !SUPPORTED_CURRENCIES.includes(schedule.currency)) {
        return NextResponse.json(
          { error: `Devise non supportee: ${schedule.currency}. Devises acceptees: ${SUPPORTED_CURRENCIES.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Verifier que le total des echeances correspond au total du devis
    // Note: Les montants des echeances sont en EUR (devise contractuelle)
    const schedulesTotal = schedules.reduce(
      (sum: number, s: { amount: number }) => sum + s.amount,
      0
    );

    if (schedulesTotal !== quote.totalAmount) {
      return NextResponse.json(
        {
          error: `Le total des echeances (${schedulesTotal}) ne correspond pas au montant du devis (${quote.totalAmount})`,
        },
        { status: 400 }
      );
    }

    // Creer les echeances
    // currency = devise de paiement attendue (peut etre EUR, MAD, USD)
    // scheduleCurrency = devise contractuelle de l'echeance (toujours EUR car devis en EUR)
    const createdSchedules = await Promise.all(
      schedules.map(
        async (schedule: { amount: number; dueDate: string; currency?: string }) => {
          const paymentCurrency = schedule.currency || quote.paymentCurrency || "EUR";
          return prisma.paymentSchedule.create({
            data: {
              studentId: quote.studentId,
              quoteId: quote.id,
              type: "STUDENT_PAYMENT",
              amount: schedule.amount, // Montant en centimes (EUR contractuel)
              currency: paymentCurrency, // Devise attendue pour le paiement
              scheduleCurrency: "EUR", // Devise contractuelle (toujours EUR)
              dueDate: new Date(schedule.dueDate),
              status: "PENDING",
              paidAmount: 0,
            },
          });
        }
      )
    );

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_PAYMENT_SCHEDULE",
        resourceType: "Quote",
        resourceId: id,
        metadata: {
          scheduleCount: createdSchedules.length,
          totalAmount: quote.totalAmount,
        },
      },
    });

    return NextResponse.json(
      {
        schedules: createdSchedules.map((s) => ({
          id: s.id,
          amount: s.amount,
          currency: s.currency,
          dueDate: s.dueDate,
          status: s.status,
        })),
        message: `Echeancier cree avec ${createdSchedules.length} echeance(s)`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating payment schedule:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation de l'echeancier" },
      { status: 500 }
    );
  }
}

// GET /api/admin/accounting/quotes/[id]/schedule - Voir l'echeancier
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
              select: { name: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        paymentSchedules: {
          orderBy: { dueDate: "asc" },
          include: {
            payments: {
              orderBy: { paymentDate: "desc" },
              include: {
                bankAccount: {
                  select: { accountName: true, currency: true },
                },
              },
            },
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Devis non trouve" }, { status: 404 });
    }

    const now = new Date();

    // Mettre a jour les statuts en retard
    for (const schedule of quote.paymentSchedules) {
      if (
        schedule.status === "PENDING" &&
        schedule.paidAmount === 0 &&
        new Date(schedule.dueDate) < now
      ) {
        await prisma.paymentSchedule.update({
          where: { id: schedule.id },
          data: { status: "OVERDUE" },
        });
        schedule.status = "OVERDUE";
      }
    }

    const totalPaid = quote.paymentSchedules.reduce(
      (sum, s) => sum + s.paidAmount,
      0
    );

    return NextResponse.json({
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      totalAmount: quote.totalAmount,
      currency: quote.currency,
      student: {
        id: quote.student.id,
        name:
          quote.student.user.firstName && quote.student.user.lastName
            ? `${quote.student.user.firstName} ${quote.student.user.lastName}`
            : quote.student.user.name,
        email: quote.student.user.email,
      },
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
        remaining: s.amount - s.paidAmount,
        payments: s.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          paymentDate: p.paymentDate,
          status: p.status,
          bankAccount: p.bankAccount,
        })),
      })),
      summary: {
        totalSchedules: quote.paymentSchedules.length,
        totalPaid,
        remaining: quote.totalAmount - totalPaid,
        percentPaid: Math.round((totalPaid / quote.totalAmount) * 100),
        pending: quote.paymentSchedules.filter((s) => s.status === "PENDING").length,
        partial: quote.paymentSchedules.filter((s) => s.status === "PARTIAL").length,
        paid: quote.paymentSchedules.filter((s) => s.status === "PAID").length,
        overdue: quote.paymentSchedules.filter((s) => s.status === "OVERDUE").length,
      },
    });
  } catch (error) {
    console.error("Error fetching payment schedule:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de l'echeancier" },
      { status: 500 }
    );
  }
}
