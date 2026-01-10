import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// PATCH /api/profile/bank-accounts/[id] - Modifier mon compte bancaire
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

    const { id } = await params;

    // Verifier que le compte appartient a l'utilisateur
    const existingAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!existingAccount) {
      return NextResponse.json(
        { error: "Compte bancaire non trouve" },
        { status: 404 }
      );
    }

    if (existingAccount.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Ce compte ne vous appartient pas" },
        { status: 403 }
      );
    }

    // Les comptes admin ne peuvent pas etre modifies par l'utilisateur
    if (existingAccount.isAdminOwned) {
      return NextResponse.json(
        { error: "Ce compte ne peut pas etre modifie" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { accountName, bankName, country, iban } = body;

    // Verifier unicite du nouveau nom si modifie
    if (accountName && accountName !== existingAccount.accountName) {
      const duplicateName = await prisma.bankAccount.findFirst({
        where: {
          userId: session.user.id,
          accountName,
          id: { not: id },
        },
      });

      if (duplicateName) {
        return NextResponse.json(
          { error: "Un compte avec ce nom existe deja" },
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
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_OWN_BANK_ACCOUNT",
        resourceType: "BankAccount",
        resourceId: id,
        metadata: {
          changes: body,
        },
      },
    });

    return NextResponse.json({
      account: {
        id: updatedAccount.id,
        accountName: updatedAccount.accountName,
        accountType: updatedAccount.accountType,
        bankName: updatedAccount.bankName,
        currency: updatedAccount.currency,
        country: updatedAccount.country,
        iban: updatedAccount.iban ? maskIban(updatedAccount.iban) : null,
        isActive: updatedAccount.isActive,
        createdAt: updatedAccount.createdAt,
      },
      message: "Compte bancaire mis a jour avec succes",
    });
  } catch (error) {
    console.error("Error updating user bank account:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour du compte bancaire" },
      { status: 500 }
    );
  }
}

// DELETE /api/profile/bank-accounts/[id] - Supprimer mon compte bancaire
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

    const { id } = await params;

    // Verifier que le compte appartient a l'utilisateur
    const existingAccount = await prisma.bankAccount.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            transactionsAsSource: true,
            transactionsAsDestination: true,
            paymentsReceived: true,
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

    if (existingAccount.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Ce compte ne vous appartient pas" },
        { status: 403 }
      );
    }

    // Les comptes admin ne peuvent pas etre supprimes par l'utilisateur
    if (existingAccount.isAdminOwned) {
      return NextResponse.json(
        { error: "Ce compte ne peut pas etre supprime" },
        { status: 403 }
      );
    }

    // Verifier si des transactions existent
    const hasTransactions =
      existingAccount._count.transactionsAsSource > 0 ||
      existingAccount._count.transactionsAsDestination > 0 ||
      existingAccount._count.paymentsReceived > 0;

    if (hasTransactions) {
      // Desactiver seulement
      await prisma.bankAccount.update({
        where: { id },
        data: { isActive: false },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DEACTIVATE_OWN_BANK_ACCOUNT",
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

    // Suppression definitive si pas de transactions
    await prisma.bankAccount.delete({
      where: { id },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_OWN_BANK_ACCOUNT",
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
    console.error("Error deleting user bank account:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du compte bancaire" },
      { status: 500 }
    );
  }
}

// Masquer l'IBAN pour la securite
function maskIban(iban: string): string {
  if (iban.length <= 4) return iban;
  return "*".repeat(iban.length - 4) + iban.slice(-4);
}
