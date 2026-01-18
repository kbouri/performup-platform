/**
 * Script to reset password for ALL users who can't login
 * Sets the default password: PerformUp2024!
 * Run with: npx tsx scripts/reset-all-passwords.ts
 */

import { PrismaClient } from "@prisma/client";
import { scrypt } from "@noble/hashes/scrypt.js";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "PerformUp2024!";

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
    const saltBytes = randomBytes(16);
    const salt = bytesToHex(new Uint8Array(saltBytes));
    const key = scrypt(password.normalize("NFKC"), salt, {
        N: config.N,
        p: config.p,
        r: config.r,
        dkLen: config.dkLen,
    });
    return `${salt}:${bytesToHex(key)}`;
}

async function resetAllPasswords() {
    console.log("🔄 Réinitialisation des mots de passe pour tous les utilisateurs...\n");

    // Get all users
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            role: true,
        },
    });

    console.log(`📊 ${users.length} utilisateurs trouvés\n`);

    let fixed = 0;
    let alreadyOk = 0;
    let errors = 0;

    for (const user of users) {
        try {
            // Check if user has credential account with password
            const account = await prisma.account.findFirst({
                where: {
                    userId: user.id,
                    providerId: "credential",
                },
            });

            if (account && account.password) {
                alreadyOk++;
                continue;
            }

            // Hash the default password
            const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

            if (account) {
                // Update existing account without password
                await prisma.account.update({
                    where: { id: account.id },
                    data: { password: hashedPassword },
                });
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
            }

            const displayName = user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.name || user.email;

            console.log(`✅ ${displayName} (${user.email}) - ${user.role}`);
            fixed++;
        } catch (error) {
            console.error(`❌ Erreur pour ${user.email}:`, error);
            errors++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`📊 Résumé:`);
    console.log(`   - Déjà OK: ${alreadyOk}`);
    console.log(`   - Corrigés: ${fixed}`);
    console.log(`   - Erreurs: ${errors}`);
    console.log(`\n🔑 Mot de passe par défaut: ${DEFAULT_PASSWORD}`);

    await prisma.$disconnect();
}

resetAllPasswords().catch((error) => {
    console.error("❌ Erreur fatale:", error);
    process.exit(1);
});
