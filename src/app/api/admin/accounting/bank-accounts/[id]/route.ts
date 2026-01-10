import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/accounting/bank-accounts/[id] - Detail d'un compte avec solde et transactions
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

    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: "Compte bancaire non trouve" },
        { status: 404 }
      );
    }

    // Calculer le solde
    const incomingSum = await prisma.transaction.aggregate({
      where: { destinationAccountId: id },
      _sum: { amount: true },
    });

    const outgoingSum = await prisma.transaction.aggregate({
      where: { sourceAccountId: id },
      _sum: { amount: true },
    });

    const balance =
      (incomingSum._sum.amount || 0) - (outgoingSum._sum.amount || 0);

    // Recuperer les dernieres transactions
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ sourceAccountId: id }, { destinationAccountId: id }],
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
      include: {
        sourceAccount: {
          select: { accountName: true, currency: true },
        },
        destinationAccount: {
          select: { accountName: true, currency: true },
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
        creator: {
          select: { name: true, firstName: true, lastName: true },
        },
      },
    });

    const transactionCount = await prisma.transaction.count({
      where: {
        OR: [{ sourceAccountId: id }, { destinationAccountId: id }],
      },
    });

    return NextResponse.json({
      account: {
        id: bankAccount.id,
        accountName: bankAccount.accountName,
        accountType: bankAccount.accountType,
        bankName: bankAccount.bankName,
        currency: bankAccount.currency,
        country: bankAccount.country,
        iban: bankAccount.iban,
        isActive: bankAccount.isActive,
        isAdminOwned: bankAccount.isAdminOwned,
        createdAt: bankAccount.createdAt,
        updatedAt: bankAccount.updatedAt,
        user: {
          id: bankAccount.user.id,
          name:
            bankAccount.user.firstName && bankAccount.user.lastName
              ? `${bankAccount.user.firstName} ${bankAccount.user.lastName}`
              : bankAccount.user.name,
          email: bankAccount.user.email,
          role: bankAccount.user.role,
        },
        balance,
      },
      transactions: transactions.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        date: t.date,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        direction: t.sourceAccountId === id ? "OUT" : "IN",
        description: t.description,
        sourceAccount: t.sourceAccount,
        destinationAccount: t.destinationAccount,
        relatedPerson: t.student
          ? {
              type: "student",
              name:
                t.student.user.firstName && t.student.user.lastName
                  ? `${t.student.user.firstName} ${t.student.user.lastName}`
                  : t.student.user.name,
            }
          : t.mentor
          ? {
              type: "mentor",
              name:
                t.mentor.user.firstName && t.mentor.user.lastName
                  ? `${t.mentor.user.firstName} ${t.mentor.user.lastName}`
                  : t.mentor.user.name,
            }
          : t.professor
          ? {
              type: "professor",
              name:
                t.professor.user.firstName && t.professor.user.lastName
                  ? `${t.professor.user.firstName} ${t.professor.user.lastName}`
                  : t.professor.user.name,
            }
          : null,
        createdBy:
          t.creator.firstName && t.creator.lastName
            ? `${t.creator.firstName} ${t.creator.lastName}`
            : t.creator.name,
        createdAt: t.createdAt,
      })),
      pagination: {
        total: transactionCount,
        limit,
        offset,
        hasMore: offset + limit < transactionCount,
      },
    });
  } catch (error) {
    console.error("Error fetching bank account:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du compte bancaire" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/accounting/bank-accounts/[id] - Modifier un compte bancaire
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

    const existingAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: "Compte bancaire non trouve" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { accountName, bankName, country, iban, isActive } = body;

    // On ne peut pas modifier la devise une fois le compte cree
    if (body.currency && body.currency !== existingAccount.currency) {
      return NextResponse.json(
        { error: "La devise ne peut pas etre modifiee" },
        { status: 400 }
      );
    }

    // Verifier unicite du nouveau nom si modifie
    if (accountName && accountName !== existingAccount.accountName) {
      const duplicateName = await prisma.bankAccount.findFirst({
        where: {
          userId: existingAccount.userId,
          accountName,
          id: { not: id },
        },
      });

      if (duplicateName) {
        return NextResponse.json(
          { error: "Un compte avec ce nom existe deja pour cet utilisateur" },
          { status: 400 }
        );
      }
    }

    const updatedAccount = await prisma.bankAccount.update({
      where: { id },
      data: {
        accountName: accountName ?? existingAccount.accountName,
        bankName: bankName !== undefined ? bankName : existingAccount.bankName,
        country: country !== undefined ? country : existingAccount.country,
        iban: iban !== undefined ? iban : existingAccount.iban,
        isActive: isActive !== undefined ? isActive : existingAccount.isActive,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_BANK_ACCOUNT",
        resourceType: "BankAccount",
        resourceId: id,
        metadata: {
          changes: body,
        },
      },
    });

    return NextResponse.json({
      account: {
        ...updatedAccount,
        user: {
          id: updatedAccount.user.id,
          name:
            updatedAccount.user.firstName && updatedAccount.user.lastName
              ? `${updatedAccount.user.firstName} ${updatedAccount.user.lastName}`
              : updatedAccount.user.name,
          email: updatedAccount.user.email,
          role: updatedAccount.user.role,
        },
      },
      message: "Compte bancaire mis a jour avec succes",
    });
  } catch (error) {
    console.error("Error updating bank account:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour du compte bancaire" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/accounting/bank-accounts/[id] - Desactiver un compte bancaire
export async function DELETE(
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

    const existingAccount = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            transactionsAsSource: true,
            transactionsAsDestination: true,
          },
        },
      },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: "Compte bancaire non trouve" },
        { status: 404 }
      );
    }

    // Si des transactions existent, on desactive seulement (soft delete)
    const hasTransactions =
      existingAccount._count.transactionsAsSource > 0 ||
      existingAccount._count.transactionsAsDestination > 0;

    if (hasTransactions) {
      await prisma.bankAccount.update({
        where: { id },
        data: { isActive: false },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DEACTIVATE_BANK_ACCOUNT",
          resourceType: "BankAccount",
          resourceId: id,
          metadata: {
            reason: "Has transactions",
          },
        },
      });

      return NextResponse.json({
        message:
          "Compte bancaire desactive (conserve car des transactions existent)",
        deactivated: true,
        deleted: false,
      });
    }

    // Sinon, suppression definitive
    await prisma.bankAccount.delete({
      where: { id },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_BANK_ACCOUNT",
        resourceType: "BankAccount",
        resourceId: id,
        metadata: {
          accountName: existingAccount.accountName,
        },
      },
    });

    return NextResponse.json({
      message: "Compte bancaire supprime avec succes",
      deactivated: false,
      deleted: true,
    });
  } catch (error) {
    console.error("Error deleting bank account:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du compte bancaire" },
      { status: 500 }
    );
  }
}
