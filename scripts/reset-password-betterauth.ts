/**
 * Script to reset password using Better Auth's scrypt format
 * Run with: npx tsx scripts/reset-password-betterauth.ts
 */

import { PrismaClient } from "@prisma/client";
import { scrypt } from "@noble/hashes/scrypt.js";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

// Better Auth config
const config = {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64,
};

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

async function hashPassword(password: string): Promise<string> {
    // Generate random salt
    const saltBytes = randomBytes(16);
    const salt = bytesToHex(new Uint8Array(saltBytes));

    // Generate key using scrypt
    const key = scrypt(password.normalize("NFKC"), salt, {
        N: config.N,
        p: config.p,
        r: config.r,
        dkLen: config.dkLen,
    });

    return `${salt}:${bytesToHex(key)}`;
}

async function resetPassword() {
    const email = "yasmine.houari@performup.fr";
    const newPassword = "PerformUp2024!";

    console.log(`🔄 Réinitialisation du mot de passe pour ${email}...`);

    // Find user
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.log("❌ Utilisateur non trouvé");
        await prisma.$disconnect();
        return;
    }

    // Hash the new password using Better Auth format
    const hashedPassword = await hashPassword(newPassword);
    console.log("Hash format:", hashedPassword.substring(0, 50) + "...");

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

    await prisma.$disconnect();
}

resetPassword().catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
});
