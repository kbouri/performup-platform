import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { hashPassword } from "@/lib/password";

const DEFAULT_PASSWORD = "PerformUp2024!";

// POST /api/admin/reset-passwords - Reset all users passwords to default
export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Hash the default password
    const hashedPassword = hashPassword(DEFAULT_PASSWORD);

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Check if user has a credential account
        const existingAccount = await prisma.account.findFirst({
          where: {
            userId: user.id,
            providerId: "credential",
          },
        });

        if (existingAccount) {
          // Update existing account password
          await prisma.account.update({
            where: { id: existingAccount.id },
            data: { password: hashedPassword },
          });
          updated++;
        } else {
          // Create new credential account
          await prisma.account.create({
            data: {
              userId: user.id,
              accountId: user.id,
              providerId: "credential",
              password: hashedPassword,
            },
          });
          created++;
        }
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error);
        errors.push(user.email);
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "RESET_ALL_PASSWORDS",
        resourceType: "User",
        resourceId: "all",
        metadata: {
          totalUsers: users.length,
          created,
          updated,
          errors: errors.length,
          performedBy: session.user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Mots de passe réinitialisés avec succès`,
      stats: {
        totalUsers: users.length,
        accountsCreated: created,
        accountsUpdated: updated,
        errors: errors.length,
        errorEmails: errors,
      },
    });
  } catch (error) {
    console.error("Error resetting passwords:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation des mots de passe" },
      { status: 500 }
    );
  }
}

// GET /api/admin/reset-passwords - Check status of accounts
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Count users and accounts
    const totalUsers = await prisma.user.count();
    const usersWithCredentialAccount = await prisma.account.count({
      where: { providerId: "credential" },
    });

    // Get users without credential accounts
    const usersWithoutAccount = await prisma.user.findMany({
      where: {
        accounts: {
          none: {
            providerId: "credential",
          },
        },
      },
      select: {
        email: true,
        role: true,
        name: true,
      },
    });

    return NextResponse.json({
      totalUsers,
      usersWithCredentialAccount,
      usersWithoutAccount: usersWithoutAccount.length,
      usersWithoutAccountList: usersWithoutAccount,
    });
  } catch (error) {
    console.error("Error checking account status:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
