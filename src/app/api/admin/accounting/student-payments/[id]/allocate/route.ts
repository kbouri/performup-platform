import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// POST /api/admin/accounting/student-payments/[id]/allocate - Allouer un paiement aux echeances
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

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        student: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Paiement non trouve" },
        { status: 404 }
      );
    }

    if (payment.status !== "VALIDATED") {
      return NextResponse.json(
        { error: "Seuls les paiements valides peuvent etre alloues" },
        { status: 400 }
      );
    }

    if (payment.scheduleId) {
      return NextResponse.json(
        { error: "Ce paiement est deja alloue a une echeance" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { allocations } = body;

    // allocations: [{ scheduleId: string, amount: number }]
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return NextResponse.json(
        { error: "Au moins une allocation est requise" },
        { status: 400 }
      );
    }

    // Verifier que le total des allocations ne depasse pas le montant du paiement
    const totalAllocated = allocations.reduce(
      (sum: number, a: { amount: number }) => sum + a.amount,
      0
    );

    if (totalAllocated > payment.amount) {
      return NextResponse.json(
        {
          error: `Le total des allocations (${totalAllocated}) depasse le montant du paiement (${payment.amount})`,
        },
        { status: 400 }
      );
    }

    // Verifier chaque echeance
    const scheduleIds = allocations.map((a: { scheduleId: string }) => a.scheduleId);
    const schedules = await prisma.paymentSchedule.findMany({
      where: {
        id: { in: scheduleIds },
        studentId: payment.studentId,
      },
    });

    if (schedules.length !== scheduleIds.length) {
      return NextResponse.json(
        { error: "Une ou plusieurs echeances sont invalides" },
        { status: 400 }
      );
    }

    // Verifier que les allocations ne depassent pas le restant a payer de chaque echeance
    for (const allocation of allocations as Array<{ scheduleId: string; amount: number }>) {
      const schedule = schedules.find((s) => s.id === allocation.scheduleId);
      if (!schedule) continue;

      const remaining = schedule.amount - schedule.paidAmount;
      if (allocation.amount > remaining) {
        return NextResponse.json(
          {
            error: `L'allocation de ${allocation.amount} depasse le restant a payer (${remaining}) pour l'echeance du ${schedule.dueDate.toLocaleDateString()}`,
          },
          { status: 400 }
        );
      }
    }

    // Appliquer les allocations
    const results = [];
    for (const allocation of allocations as Array<{ scheduleId: string; amount: number }>) {
      const schedule = schedules.find((s) => s.id === allocation.scheduleId)!;

      const newPaidAmount = schedule.paidAmount + allocation.amount;
      const newStatus =
        newPaidAmount >= schedule.amount
          ? "PAID"
          : newPaidAmount > 0
          ? "PARTIAL"
          : schedule.status;

      const updatedSchedule = await prisma.paymentSchedule.update({
        where: { id: allocation.scheduleId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          paidDate: newStatus === "PAID" ? new Date() : null,
          actualCurrency:
            payment.currency !== schedule.currency ? payment.currency : null,
        },
      });

      results.push({
        scheduleId: allocation.scheduleId,
        allocatedAmount: allocation.amount,
        newPaidAmount,
        newStatus,
        dueDate: updatedSchedule.dueDate,
      });
    }

    // Mettre a jour le paiement avec l'echeance principale (la premiere)
    if (allocations.length === 1) {
      await prisma.payment.update({
        where: { id },
        data: { scheduleId: allocations[0].scheduleId },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ALLOCATE_PAYMENT",
        resourceType: "Payment",
        resourceId: id,
        metadata: {
          allocations: results,
          totalAllocated,
        },
      },
    });

    return NextResponse.json({
      message: `Paiement alloue a ${results.length} echeance(s)`,
      allocations: results,
      totalAllocated,
      remainingUnallocated: payment.amount - totalAllocated,
    });
  } catch (error) {
    console.error("Error allocating payment:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'allocation du paiement" },
      { status: 500 }
    );
  }
}

// GET /api/admin/accounting/student-payments/[id]/allocate - Obtenir les echeances disponibles pour allocation
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

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Paiement non trouve" },
        { status: 404 }
      );
    }

    // Trouver les echeances non entierement payees pour cet etudiant
    const schedules = await prisma.paymentSchedule.findMany({
      where: {
        studentId: payment.studentId,
        status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      },
      orderBy: { dueDate: "asc" },
      include: {
        quote: {
          select: { quoteNumber: true },
        },
      },
    });

    return NextResponse.json({
      paymentAmount: payment.amount,
      paymentCurrency: payment.currency,
      availableSchedules: schedules.map((s) => ({
        id: s.id,
        amount: s.amount,
        currency: s.currency,
        dueDate: s.dueDate,
        status: s.status,
        paidAmount: s.paidAmount,
        remaining: s.amount - s.paidAmount,
        quoteNumber: s.quote?.quoteNumber,
      })),
    });
  } catch (error) {
    console.error("Error fetching allocatable schedules:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des echeances" },
      { status: 500 }
    );
  }
}
