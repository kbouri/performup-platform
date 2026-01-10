import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Definition des comptes bancaires pre-definis pour les admins
// Selon les specifications: Karim, Simo, Sara avec leurs comptes respectifs

interface AdminBankAccountConfig {
  adminEmail: string;
  adminName: string;
  accounts: {
    accountName: string;
    accountType: "BANK" | "CASH";
    bankName?: string;
    currency: "EUR" | "MAD" | "USD";
    country?: string;
    iban?: string;
  }[];
}

const adminBankAccounts: AdminBankAccountConfig[] = [
  {
    adminEmail: "karim@performup.fr",
    adminName: "Karim Bouri",
    accounts: [
      {
        accountName: "CIH Karim",
        accountType: "BANK",
        bankName: "CIH Bank",
        currency: "MAD",
        country: "MA",
      },
      {
        accountName: "Caisse Epargne Karim",
        accountType: "BANK",
        bankName: "Caisse Epargne",
        currency: "EUR",
        country: "FR",
      },
      {
        accountName: "Revolut Karim",
        accountType: "BANK",
        bankName: "Revolut",
        currency: "EUR",
        country: "FR",
      },
      {
        accountName: "LCL Karim",
        accountType: "BANK",
        bankName: "LCL",
        currency: "EUR",
        country: "FR",
      },
      {
        accountName: "Cash Karim MAD",
        accountType: "CASH",
        currency: "MAD",
        country: "MA",
      },
      {
        accountName: "Cash Karim EUR",
        accountType: "CASH",
        currency: "EUR",
        country: "FR",
      },
      {
        accountName: "Cash Karim USD",
        accountType: "CASH",
        currency: "USD",
        country: "US",
      },
    ],
  },
  {
    adminEmail: "simo@performup.fr",
    adminName: "Simo",
    accounts: [
      {
        accountName: "Revolut Simo",
        accountType: "BANK",
        bankName: "Revolut",
        currency: "EUR",
        country: "FR",
      },
      {
        accountName: "Compte Maroc Pere Simo",
        accountType: "BANK",
        currency: "MAD",
        country: "MA",
      },
      {
        accountName: "Cash Simo MAD",
        accountType: "CASH",
        currency: "MAD",
        country: "MA",
      },
      {
        accountName: "Cash Simo EUR",
        accountType: "CASH",
        currency: "EUR",
        country: "FR",
      },
      {
        accountName: "Cash Simo USD",
        accountType: "CASH",
        currency: "USD",
        country: "US",
      },
    ],
  },
  {
    adminEmail: "sara@performup.fr",
    adminName: "Sara",
    accounts: [
      {
        accountName: "Revolut Sara",
        accountType: "BANK",
        bankName: "Revolut",
        currency: "EUR",
        country: "FR",
      },
      {
        accountName: "Compte Maroc Mere Sara",
        accountType: "BANK",
        currency: "MAD",
        country: "MA",
      },
      {
        accountName: "Cash Sara MAD",
        accountType: "CASH",
        currency: "MAD",
        country: "MA",
      },
      {
        accountName: "Cash Sara EUR",
        accountType: "CASH",
        currency: "EUR",
        country: "FR",
      },
      {
        accountName: "Cash Sara USD",
        accountType: "CASH",
        currency: "USD",
        country: "US",
      },
    ],
  },
];

async function seedBankAccounts() {
  console.log("🏦 Seeding admin bank accounts...\n");

  for (const adminConfig of adminBankAccounts) {
    // Chercher l'admin par email
    let admin = await prisma.user.findUnique({
      where: { email: adminConfig.adminEmail },
    });

    // Si l'admin n'existe pas, le creer
    if (!admin) {
      console.log(`  Creating admin user: ${adminConfig.adminEmail}`);
      admin = await prisma.user.create({
        data: {
          email: adminConfig.adminEmail,
          name: adminConfig.adminName,
          firstName: adminConfig.adminName.split(" ")[0],
          lastName: adminConfig.adminName.split(" ").slice(1).join(" ") || null,
          role: "ADMIN",
          emailVerified: true,
          active: true,
        },
      });

      // Creer le profil Admin
      await prisma.admin.create({
        data: { userId: admin.id },
      });
    }

    console.log(`\n📋 Processing accounts for ${adminConfig.adminName} (${adminConfig.adminEmail})`);

    for (const accountData of adminConfig.accounts) {
      // Verifier si le compte existe deja
      const existingAccount = await prisma.bankAccount.findFirst({
        where: {
          userId: admin.id,
          accountName: accountData.accountName,
        },
      });

      if (existingAccount) {
        console.log(`  ⏩ Skip: ${accountData.accountName} (already exists)`);
        continue;
      }

      // Creer le compte bancaire
      await prisma.bankAccount.create({
        data: {
          userId: admin.id,
          accountType: accountData.accountType,
          bankName: accountData.bankName || null,
          accountName: accountData.accountName,
          currency: accountData.currency,
          country: accountData.country || null,
          iban: accountData.iban || null,
          isActive: true,
          isAdminOwned: true,
        },
      });

      console.log(`  ✅ Created: ${accountData.accountName} (${accountData.currency})`);
    }

    // Creer les positions initiales pour cet admin (une par devise)
    const currencies = ["EUR", "MAD", "USD"] as const;
    for (const currency of currencies) {
      const existingPosition = await prisma.adminPosition.findUnique({
        where: {
          adminId_currency: {
            adminId: admin.id,
            currency: currency,
          },
        },
      });

      if (!existingPosition) {
        await prisma.adminPosition.create({
          data: {
            adminId: admin.id,
            currency: currency,
            advanced: 0,
            received: 0,
          },
        });
        console.log(`  💰 Created position: ${adminConfig.adminName} - ${currency}`);
      }
    }
  }

  console.log("\n🎉 Bank accounts seeding completed!");
}

// Export pour utilisation dans d'autres scripts
export { seedBankAccounts };

// Execution directe si lance en tant que script
if (require.main === module) {
  seedBankAccounts()
    .catch((e) => {
      console.error("❌ Error seeding bank accounts:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
