/**
 * Test script to verify password authentication
 */

import { PrismaClient } from "@prisma/client";
import { scrypt } from "@noble/hashes/scrypt.js";

const prisma = new PrismaClient();

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function verifyPassword(password: string, hash: string): boolean {
  const parts = hash.split(':');
  if (parts.length !== 2) {
    console.log('Format de hash invalide');
    return false;
  }

  const [salt, storedKey] = parts;

  const key = scrypt(password.normalize('NFKC'), salt, {
    N: 16384, p: 1, r: 16, dkLen: 64
  });

  const computedKey = bytesToHex(key);
  console.log('Salt:', salt);
  console.log('Stored key:', storedKey.substring(0, 30) + '...');
  console.log('Computed key:', computedKey.substring(0, 30) + '...');

  return computedKey === storedKey;
}

async function testAllUsers() {
  const testPassword = 'PerformUp2024!';

  console.log('=== TEST DE CONNEXION POUR TOUS LES UTILISATEURS ===\n');
  console.log('Mot de passe testé:', testPassword);
  console.log('\n');

  const accounts = await prisma.account.findMany({
    where: { providerId: 'credential' },
    include: { user: true }
  });

  let success = 0;
  let failed = 0;

  for (const account of accounts) {
    if (!account.password) {
      console.log(`❌ ${account.user.email} - PAS DE MOT DE PASSE`);
      failed++;
      continue;
    }

    console.log(`\nTest: ${account.user.email}`);
    const isValid = verifyPassword(testPassword, account.password);

    if (isValid) {
      console.log(`✅ VALIDE`);
      success++;
    } else {
      console.log(`❌ INVALIDE`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Résultat: ${success} OK / ${failed} ÉCHOUÉ sur ${accounts.length} comptes`);

  await prisma.$disconnect();
}

testAllUsers().catch(console.error);
