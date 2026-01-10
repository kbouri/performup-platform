/**
 * Script to reset password for Yasmine Houari
 * Run with: npx tsx scripts/reset-yasmine-password.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetPassword() {
    const email = "yasmine.houari@performup.fr";
    const newPassword = "password"; // Changez si vous voulez un autre mot de passe

    console.log(`🔄 Réinitialisation du mot de passe pour ${email}...`);

    // Find user
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.log("❌ Utilisateur non trouvé");
        return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Find existing account
    const existingAccount = await prisma.account.findFirst({
        where: {
            userId: user.id,
            providerId: "credential",
        },
    });

    if (existingAccount) {
        // Update existing account
        await prisma.account.update({
            where: { id: existingAccount.id },
            data: { password: hashedPassword },
        });
    } else {
        // Create new account
        await prisma.account.create({
            data: {
                userId: user.id,
                accountId: email,
                providerId: "credential",
                password: hashedPassword,
            },
        });
    }

    console.log("✅ Mot de passe réinitialisé avec succès !");
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Nouveau mot de passe: ${newPassword}`);
    console.log("\n⚠️  N'oubliez pas de changer ce mot de passe après la première connexion !");

    await prisma.$disconnect();
}

resetPassword().catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
});
