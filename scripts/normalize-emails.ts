/**
 * Script to normalize all user emails to lowercase
 * This fixes the case-sensitivity issue with Better Auth login
 * Run with: npx tsx scripts/normalize-emails.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function normalizeEmails() {
  console.log("=== NORMALISATION DES EMAILS EN MINUSCULES ===\n");

  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
    },
  });

  console.log(`📊 ${users.length} utilisateurs trouvés\n`);

  let normalized = 0;
  let alreadyLowercase = 0;
  let errors = 0;

  for (const user of users) {
    const lowerEmail = user.email.toLowerCase();

    if (user.email === lowerEmail) {
      console.log(`✓ ${user.email} (déjà en minuscules)`);
      alreadyLowercase++;
      continue;
    }

    try {
      // Check if lowercase version already exists
      const existing = await prisma.user.findFirst({
        where: {
          email: lowerEmail,
          id: { not: user.id },
        },
      });

      if (existing) {
        console.log(`⚠️ ${user.email} -> ${lowerEmail} (CONFLIT: email déjà existant)`);
        errors++;
        continue;
      }

      // Update user email
      await prisma.user.update({
        where: { id: user.id },
        data: { email: lowerEmail },
      });

      console.log(`✅ ${user.email} -> ${lowerEmail}`);
      normalized++;
    } catch (error) {
      console.error(`❌ Erreur pour ${user.email}:`, error);
      errors++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`📊 Résumé:`);
  console.log(`   - Emails normalisés: ${normalized}`);
  console.log(`   - Déjà en minuscules: ${alreadyLowercase}`);
  console.log(`   - Erreurs: ${errors}`);
  console.log(`   - Total: ${users.length}`);

  await prisma.$disconnect();
}

normalizeEmails().catch((error) => {
  console.error("❌ Erreur fatale:", error);
  process.exit(1);
});
