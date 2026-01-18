/**
 * Debug script to check user data structure
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugUsers() {
  console.log("=== DEBUG: STRUCTURE DES UTILISATEURS ===\n");

  // Get all users with their accounts
  const users = await prisma.user.findMany({
    include: {
      accounts: true,
    },
  });

  console.log(`Total users: ${users.length}\n`);

  for (const user of users) {
    console.log(`\n--- User: ${user.email} ---`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name || user.firstName + " " + user.lastName}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Email verified: ${user.emailVerified}`);
    console.log(`  Active: ${user.active}`);
    console.log(`  Accounts: ${user.accounts.length}`);

    for (const account of user.accounts) {
      console.log(`    - Provider: ${account.providerId}`);
      console.log(`      AccountId: ${account.accountId}`);
      console.log(`      Has password: ${!!account.password}`);
      if (account.password) {
        const [salt, key] = account.password.split(":");
        console.log(`      Password format valid: ${salt && key ? "YES" : "NO"}`);
      }
    }
  }

  // Check for orphan accounts (accounts without users)
  const accounts = await prisma.account.findMany({
    where: { providerId: "credential" },
    include: { user: true },
  });

  console.log("\n\n=== COMPTES CREDENTIAL ===");
  for (const account of accounts) {
    console.log(`Account for: ${account.user.email}`);
    console.log(`  User exists: ${!!account.user}`);
  }

  await prisma.$disconnect();
}

debugUsers().catch(console.error);
