import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";
import { seedSchools, seedPacks } from "./seed-data";

const prisma = new PrismaClient();

// Hash password exactly like Better Auth does
function hashPassword(password: string): string {
  // Generate 16 random bytes for salt
  const salt = randomBytes(16).toString("hex");

  // Config matching Better Auth: N=16384, r=16, p=1, dkLen=64
  const key = scryptSync(password.normalize("NFKC"), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  });

  // Format: salt:key (both hex encoded)
  return `${salt}:${key.toString("hex")}`;
}

async function main() {
  console.log("🌱 Seeding database...\n");

  const password = "PerformUp2024!";

  const usersData = [
    {
      email: "admin@performup.fr",
      name: "Admin PerformUp",
      firstName: "Admin",
      lastName: "PerformUp",
      role: "ADMIN",
    },
    {
      email: "prof@performup.fr",
      name: "Professeur Martin",
      firstName: "Jean",
      lastName: "Martin",
      role: "PROFESSOR",
    },
    {
      email: "mentor@performup.fr",
      name: "Sophie Dubois",
      firstName: "Sophie",
      lastName: "Dubois",
      role: "MENTOR",
    },
    {
      email: "exec@performup.fr",
      name: "Pierre Laurent",
      firstName: "Pierre",
      lastName: "Laurent",
      role: "EXECUTIVE_CHEF",
    },
    {
      email: "student@performup.fr",
      name: "Marie Dupont",
      firstName: "Marie",
      lastName: "Dupont",
      role: "STUDENT",
    },
  ];

  // Delete existing test users first
  console.log("🗑️  Cleaning up existing test users...\n");
  for (const userData of usersData) {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      if (existingUser) {
        // Delete all related records first (in correct order to avoid FK constraints)
        await prisma.account.deleteMany({ where: { userId: existingUser.id } });
        await prisma.session.deleteMany({ where: { userId: existingUser.id } });

        // Delete impersonation sessions
        await prisma.impersonationSession.deleteMany({
          where: {
            OR: [
              { adminUserId: existingUser.id },
              { targetUserId: existingUser.id }
            ]
          }
        });

        // Delete role-specific profiles
        await prisma.admin.deleteMany({ where: { userId: existingUser.id } });
        await prisma.professor.deleteMany({ where: { userId: existingUser.id } });
        await prisma.mentor.deleteMany({ where: { userId: existingUser.id } });
        await prisma.executiveChef.deleteMany({ where: { userId: existingUser.id } });
        await prisma.student.deleteMany({ where: { userId: existingUser.id } });

        // Finally delete the user
        await prisma.user.delete({ where: { id: existingUser.id } });
        console.log(`  ✅ Deleted: ${userData.email}`);
      } else {
        console.log(`  ⏭️  Skip: ${userData.email} (not found)`);
      }
    } catch (error) {
      console.log(`  ❌ Error deleting ${userData.email}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log("\n📝 Creating users with properly hashed passwords...\n");

  for (const userData of usersData) {
    try {
      // Hash password for this user
      const hashedPassword = hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          emailVerified: true,
          active: true,
        },
      });

      // Create account with password (using "credential" as providerId for Better Auth)
      await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.id,
          password: hashedPassword,
        },
      });

      // Create role-specific profile
      switch (userData.role) {
        case "ADMIN":
          await prisma.admin.create({ data: { userId: user.id } });
          break;
        case "PROFESSOR":
          await prisma.professor.create({
            data: { userId: user.id, type: "QUANT", hourlyRate: 8000 },
          });
          break;
        case "MENTOR":
          await prisma.mentor.create({
            data: {
              userId: user.id,
              specialties: ["HEC", "ESSEC", "ESCP"],
              paymentType: "MONTHLY",
            },
          });
          break;
        case "EXECUTIVE_CHEF":
          await prisma.executiveChef.create({ data: { userId: user.id } });
          break;
        case "STUDENT":
          await prisma.student.create({
            data: {
              userId: user.id,
              status: "EN_COURS",
              programType: "MASTER",
              nationality: "Française",
              currentFormation: "Master 1 Finance - Paris Dauphine",
            },
          });
          break;
      }

      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    } catch (error) {
      console.error(`❌ Failed to create ${userData.email}:`, error);
    }
  }

  // Seed schools and packs
  console.log("\n");
  await seedSchools();
  console.log("\n");
  await seedPacks();

  console.log("\n🎉 Seeding completed!\n");
  console.log("📧 Identifiants créés:");
  console.log("─".repeat(50));
  console.log("admin@performup.fr     → Admin");
  console.log("prof@performup.fr      → Professeur");
  console.log("mentor@performup.fr    → Mentor");
  console.log("exec@performup.fr      → Chef Exécutif");
  console.log("student@performup.fr   → Étudiant");
  console.log("─".repeat(50));
  console.log("🔑 Mot de passe pour tous: PerformUp2024!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
