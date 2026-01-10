import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/student/accounting - Vue comptabilite complete pour l'etudiant
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Trouver le profil etudiant
    const student = await prisma.student.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: { name: true, firstName: true, lastName: true, email: true },
        },
        packs: {
          where: { status: "active" },
          include: {
            pack: {
              select: { displayName: true, description: true },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Profil etudiant non trouve" },
        { status: 404 }
      );
    }

    // Recuperer le devis valide
    const quote = await prisma.quote.findFirst({
      where: {
        studentId: student.id,
        status: "VALIDATED",
      },
      include: {
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

    // Recuperer l'echeancier
    const schedules = await prisma.paymentSchedule.findMany({
      where: {
        studentId: student.id,
        type: "STUDENT_PAYMENT",
      },
      orderBy: { dueDate: "asc" },
    });

    // Mettre a jour les statuts en retard
    const now = new Date();
    for (const schedule of schedules) {
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

    // Recuperer les paiements valides
    const payments = await prisma.payment.findMany({
      where: {
        studentId: student.id,
        status: "VALIDATED",
      },
      orderBy: { paymentDate: "desc" },
      select: {
        id: true,
        amount: true,
        currency: true,
        paymentDate: true,
        notes: true,
      },
    });

    // Calculer les totaux
    const totalAmount = quote?.totalAmount || 0;
    const totalPaid = schedules.reduce((sum, s) => sum + s.paidAmount, 0);
    const remaining = totalAmount - totalPaid;

    return NextResponse.json({
      student: {
        id: student.id,
        name:
          student.user.firstName && student.user.lastName
            ? `${student.user.firstName} ${student.user.lastName}`
            : student.user.name,
        email: student.user.email,
      },
      packs: student.packs.map((sp) => ({
        id: sp.id,
        name: sp.pack.displayName,
        description: sp.pack.description,
        customPrice: sp.customPrice,
        status: sp.status,
      })),
      quote: quote
        ? {
            id: quote.id,
            quoteNumber: quote.quoteNumber,
            totalAmount: quote.totalAmount,
            currency: quote.currency,
            paymentCurrency: quote.paymentCurrency,
            status: quote.status,
            validatedAt: quote.validatedAt,
            items: quote.items.map((item) => ({
              id: item.id,
              amount: item.amount,
              description: item.description,
              packName: item.studentPack.pack.displayName,
            })),
          }
        : null,
      schedules: schedules.map((s) => ({
        id: s.id,
        amount: s.amount,
        currency: s.currency,
        dueDate: s.dueDate,
        status: s.status,
        paidAmount: s.paidAmount,
        remaining: s.amount - s.paidAmount,
        paidDate: s.paidDate,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        paymentDate: p.paymentDate,
        notes: p.notes,
      })),
      summary: {
        totalAmount,
        totalPaid,
        remaining,
        percentPaid: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0,
        scheduleCount: schedules.length,
        paidSchedules: schedules.filter((s) => s.status === "PAID").length,
        pendingSchedules: schedules.filter((s) => s.status === "PENDING").length,
        partialSchedules: schedules.filter((s) => s.status === "PARTIAL").length,
        overdueSchedules: schedules.filter((s) => s.status === "OVERDUE").length,
        paymentCount: payments.length,
      },
    });
  } catch (error) {
    console.error("Error fetching student accounting:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des donnees comptables" },
      { status: 500 }
    );
  }
}
