import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { TransactionTypeLabels, type TransactionType } from "@/lib/accounting";

// GET /api/admin/accounting/journal/export - Exporter le journal en CSV
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
    const type = searchParams.get("type");
    const currency = searchParams.get("currency");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (type && type !== "all") {
      where.type = type;
    }

    if (currency && currency !== "all") {
      where.currency = currency;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: {
        sourceAccount: {
          select: { accountName: true },
        },
        destinationAccount: {
          select: { accountName: true },
        },
        student: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
        mentor: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
        professor: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // Generer le CSV
    const csvHeaders = [
      "Numero",
      "Date",
      "Type",
      "Montant",
      "Devise",
      "Compte Source",
      "Compte Destination",
      "Description",
      "Etudiant",
      "Mentor",
      "Professeur",
      "Notes",
    ];

    const csvRows = transactions.map((t) => {
      const getName = (
        user: { name: string | null; firstName: string | null; lastName: string | null } | undefined
      ) => {
        if (!user) return "";
        return user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.name || "";
      };

      return [
        t.transactionNumber,
        t.date.toISOString().split("T")[0],
        TransactionTypeLabels[t.type as TransactionType] || t.type,
        (t.amount / 100).toFixed(2),
        t.currency,
        t.sourceAccount?.accountName || "",
        t.destinationAccount?.accountName || "",
        t.description || "",
        t.student ? getName(t.student.user) : "",
        t.mentor ? getName(t.mentor.user) : "",
        t.professor ? getName(t.professor.user) : "",
        t.notes || "",
      ];
    });

    // Echapper les valeurs CSV
    const escapeCSV = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.map((cell) => escapeCSV(String(cell))).join(",")),
    ].join("\n");

    // Ajouter BOM pour Excel
    const BOM = "\uFEFF";
    const csvWithBOM = BOM + csvContent;

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "EXPORT_JOURNAL",
        resourceType: "Transaction",
        resourceId: "all",
        metadata: {
          count: transactions.length,
          filters: { type, currency, startDate, endDate },
        },
      },
    });

    // Creer le nom du fichier
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `journal_comptable_${dateStr}.csv`;

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting journal:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'export du journal" },
      { status: 500 }
    );
  }
}
