import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// =============================================
// ÉCOLES ET PROGRAMMES
// =============================================

const schoolsData = [
  // FRANCE
  {
    name: "HEC Paris",
    country: "France",
    city: "Jouy-en-Josas",
    website: "https://www.hec.edu",
    programs: [
      { name: "Master in Management (Grande École)", type: "MiM", duration: "2 ans", degree: "Master" },
      { name: "Master in International Finance", type: "MIF", duration: "1 an", degree: "Master" },
      { name: "Master in Accounting, Finance & Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "Master in Economics & Finance", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "Master in Marketing", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "Master in Strategic Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "Master in Sustainability & Social Innovation", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Data Science & AI for Business (X-HEC)", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc X-HEC Entrepreneurs", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "Master in Management & Public Affairs (HEC-FU Berlin)", type: "MiM", duration: "2 ans", degree: "Master" },
      { name: "Master in Management & Business Law (HEC-Paris 1)", type: "MiM", duration: "2 ans", degree: "Master" },
      { name: "M2M HEC-Yale", type: "MiM", duration: "2 ans", degree: "Master" },
      { name: "Double Degree Data & Finance (X-HEC)", type: "MSc", duration: "2 ans", degree: "Master" },
    ],
  },
  {
    name: "ESSEC Business School",
    country: "France",
    city: "Cergy-Pontoise",
    website: "https://www.essec.edu",
    programs: [
      { name: "Master in Management (Grande École)", type: "MiM", duration: "2-3 ans", degree: "Master" },
      { name: "Master in Finance (MIF)", type: "MIF", duration: "1 an", degree: "Master" },
      { name: "Master in Data Sciences & Business Analytics (DSBA)", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "Master in Strategy & Management of International Business (SMIB)", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "Master in Luxury Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Marketing Management & Digital", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Sustainability Transformation", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Hospitality Management (IMHI)", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc CentraleSupélec-ESSEC Entrepreneurs", type: "MSc", duration: "2 ans", degree: "Master" },
    ],
  },
  {
    name: "ESCP Business School",
    country: "France",
    city: "Paris",
    website: "https://escp.eu",
    programs: [
      { name: "Master in Management (MiM)", type: "MiM", duration: "2 ans", degree: "Master" },
      { name: "MSc in Marketing & Communication", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Marketing & Creativity", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Marketing & Digital Media", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in International Sales Management (Sales 4.0)", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in International Business & Diplomacy", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Digital Project Management & Consulting", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in International Project Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Strategy & Organisation Consulting", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Real Estate", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Business Analytics & AI", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Digital Transformation Management & Leadership", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Innovation & Entrepreneurship", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Impact Entrepreneurship", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Finance", type: "MIF", duration: "1 an", degree: "Master" },
      { name: "MSc in International Business Law & Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in International Wealth Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Biopharmaceutical Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Energy Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in International Sustainability Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Luxury Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Hospitality & Tourism Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in International Food & Beverage Management", type: "MSc", duration: "1 an", degree: "Master" },
    ],
  },
  {
    name: "EDHEC Business School",
    country: "France",
    city: "Lille/Nice",
    website: "https://www.edhec.edu",
    programs: [
      { name: "Master in Management - Grande École (MiM)", type: "MiM", duration: "2-3 ans", degree: "Master" },
      { name: "Master in Management - Data Science & AI Track", type: "MiM", duration: "2-3 ans", degree: "Master" },
      { name: "Master in Management - Business Management Track", type: "MiM", duration: "2-3 ans", degree: "Master" },
      { name: "Master in Management - Finance Track", type: "MiM", duration: "2-3 ans", degree: "Master" },
      { name: "Global Master in Management (GETT)", type: "MiM", duration: "2 ans", degree: "Master" },
      { name: "MSc in Accounting & Finance", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Climate Change & Sustainable Finance (ESG)", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Corporate Finance & Banking", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Financial Engineering", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in International Finance", type: "MIF", duration: "1 an", degree: "Master" },
      { name: "MSc in Creative Industries, Entertainment & Arts Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Data Analytics & Artificial Intelligence", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Entrepreneurship & Innovation", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Sustainable Business Transformation", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Marketing Analytics", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Marketing Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Strategy, Organisation & Consulting", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "LL.M. in Law & Tax Management", type: "LLM", duration: "1 an", degree: "Master" },
    ],
  },
  {
    name: "SKEMA Business School",
    country: "France",
    city: "Sophia Antipolis/Paris/Lille",
    website: "https://www.skema.edu",
    programs: [
      { name: "Master in Management (Grande École, PGE)", type: "MiM", duration: "2-3 ans", degree: "Master" },
      { name: "MSc in Artificial Intelligence for Business Transformation", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Auditing, Management Accounting & Information Systems", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Business Consulting & Decision Intelligence", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Corporate Financial Management", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Digital Marketing & Artificial Intelligence", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Digital Marketing & Business of Entertainment", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Entrepreneurship & Innovation", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Entrepreneurship & Design for Sustainability", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Entrepreneurship, Technology & Startup Management", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Financial Markets & Investments", type: "MIF", duration: "2 ans", degree: "Master" },
      { name: "MSc in Global Luxury & Management", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Global Supply Chain Mgmt & Procurement", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in International Business", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Int'l HR & Performance Mgmt", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Int'l Marketing & Business Development", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Luxury & Fashion Management", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Product Mgmt & UX Design", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Project Mgmt for Business Dev", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Strategic Mgmt & Consulting", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Sustainable Finance & Fintech", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Sport, Event & Hospitality Mgmt", type: "MSc", duration: "2 ans", degree: "Master" },
    ],
  },
  {
    name: "INSEAD",
    country: "France",
    city: "Fontainebleau",
    website: "https://www.insead.edu",
    programs: [
      { name: "Master in Management (MiM)", type: "MiM", duration: "14-16 mois", degree: "Master" },
      { name: "Master in Finance (MIF)", type: "MIF", duration: "1 an", degree: "Master" },
    ],
  },
  // UK
  {
    name: "London Business School",
    country: "UK",
    city: "London",
    website: "https://www.london.edu",
    programs: [
      { name: "Masters in Management (MiM)", type: "MiM", duration: "1 an", degree: "Master" },
      { name: "Global Masters in Management (GMIM, with CEIBS)", type: "MiM", duration: "2 ans", degree: "Master" },
      { name: "Masters in Financial Analysis", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Analytics & Management Science", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "Masters in Finance (MiF)", type: "MIF", duration: "10-22 mois", degree: "Master" },
    ],
  },
  {
    name: "Imperial College Business School",
    country: "UK",
    city: "London",
    website: "https://www.imperial.ac.uk/business-school",
    programs: [
      { name: "MSc Finance", type: "MIF", duration: "1 an", degree: "Master" },
      { name: "MSc Finance & Accounting", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Financial Technology", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Investment & Wealth Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Risk Management & Financial Engineering", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Management (MiM)", type: "MiM", duration: "1 an", degree: "Master" },
      { name: "MSc Economics & Strategy for Business", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Strategic Marketing", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Business Analytics & AI", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Climate Change, Management & Finance", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Innovation, Entrepreneurship & Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc Global Health Management", type: "MSc", duration: "1 an", degree: "Master" },
    ],
  },
  {
    name: "London School of Economics (LSE)",
    country: "UK",
    city: "London",
    website: "https://www.lse.ac.uk",
    programs: [
      { name: "MSc in Management", type: "MiM", duration: "1 an", degree: "Master" },
      { name: "Global MSc in Management (two-year)", type: "MiM", duration: "2 ans", degree: "Master" },
      { name: "MSc Finance and Economics", type: "MIF", duration: "1 an", degree: "Master" },
      { name: "MSc Marketing", type: "MSc", duration: "1 an", degree: "Master" },
    ],
  },
  // ITALIE
  {
    name: "Bocconi University",
    country: "Italie",
    city: "Milan",
    website: "https://www.unibocconi.eu",
    programs: [
      { name: "MSc in International Management (MIM)", type: "MiM", duration: "2 ans", degree: "Master" },
      { name: "MSc in Accounting & Financial Management", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Finance", type: "MIF", duration: "2 ans", degree: "Master" },
      { name: "MSc in Marketing Management", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Innovation, Technology & Entrepreneurship", type: "MSc", duration: "2 ans", degree: "Master" },
      { name: "MSc in Data Science & Business Analytics", type: "MSc", duration: "2 ans", degree: "Master" },
    ],
  },
  // ESPAGNE
  {
    name: "IE Business School",
    country: "Espagne",
    city: "Madrid",
    website: "https://www.ie.edu",
    programs: [
      { name: "Master in Management", type: "MiM", duration: "1 an", degree: "Master" },
      { name: "Master in Management & Strategy", type: "MiM", duration: "1 an", degree: "Master" },
      { name: "Master in Finance (MIF)", type: "MIF", duration: "10 mois", degree: "Master" },
    ],
  },
  {
    name: "ESADE Business School",
    country: "Espagne",
    city: "Barcelona",
    website: "https://www.esade.edu",
    programs: [
      { name: "MSc in International Management (MIM)", type: "MiM", duration: "1 an", degree: "Master" },
      { name: "MSc in Finance", type: "MIF", duration: "1 an", degree: "Master" },
      { name: "MSc in Marketing Management", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Business Analytics (with EPSEM)", type: "MSc", duration: "1 an", degree: "Master" },
      { name: "MSc in Innovation & Entrepreneurship", type: "MSc", duration: "1 an", degree: "Master" },
    ],
  },
  {
    name: "IESE Business School",
    country: "Espagne",
    city: "Barcelona",
    website: "https://www.iese.edu",
    programs: [
      { name: "Master in Management (MiM)", type: "MiM", duration: "1 an", degree: "Master" },
      { name: "Master in Finance (MiF)", type: "MIF", duration: "1 an", degree: "Master" },
    ],
  },
  // SUISSE
  {
    name: "University of St. Gallen (HSG)",
    country: "Suisse",
    city: "St. Gallen",
    website: "https://www.unisg.ch",
    programs: [
      { name: "Master in Strategy & International Management (SIM)", type: "MiM", duration: "18 mois", degree: "Master" },
      { name: "Master in Banking & Finance (MBF)", type: "MIF", duration: "18 mois", degree: "Master" },
      { name: "Master in Business Innovation (MBI)", type: "MSc", duration: "18 mois", degree: "Master" },
      { name: "Master in General Management (MGM)", type: "MiM", duration: "18 mois", degree: "Master" },
      { name: "Master in Marketing Management (MiMM)", type: "MSc", duration: "18 mois", degree: "Master" },
    ],
  },
];

// =============================================
// PACKS
// =============================================

const packsData = [
  // Elite Prep - Test Preparation
  {
    name: "PACK_ELITE_PREP_GRE",
    displayName: "Elite Prep - GRE",
    description: "Préparation complète au GRE (Graduate Record Examination). Cours quant/verbal, tests blancs, sessions enregistrées.",
    price: 0, // Prix configurable
    geography: null,
    isAddon: false,
    folderTemplate: {
      name: "Pack Test GRE",
      children: [
        {
          name: "Cours & Supports",
          children: [
            { name: "Quantitative" },
            { name: "Verbal" },
          ],
        },
        { name: "Ressources Globales GRE" },
        { name: "Tests Blancs & Diagnostics" },
        { name: "Sessions Enregistrées" },
      ],
    },
  },
  {
    name: "PACK_ELITE_PREP_GMAT",
    displayName: "Elite Prep - GMAT",
    description: "Préparation complète au GMAT (Graduate Management Admission Test). Cours quant/verbal, tests blancs, sessions enregistrées.",
    price: 0,
    geography: null,
    isAddon: false,
    folderTemplate: {
      name: "Pack Test GMAT",
      children: [
        {
          name: "Cours & Supports",
          children: [
            { name: "Quantitative" },
            { name: "Verbal" },
          ],
        },
        { name: "Ressources Globales GMAT" },
        { name: "Tests Blancs & Diagnostics" },
        { name: "Sessions Enregistrées" },
      ],
    },
  },
  {
    name: "PACK_ELITE_PREP_TAGEMAGE",
    displayName: "Elite Prep - TageMage",
    description: "Préparation complète au TageMage. Cours, exercices, tests blancs, et sessions enregistrées.",
    price: 0,
    geography: null,
    isAddon: false,
    folderTemplate: {
      name: "Pack Test TageMage",
      children: [
        {
          name: "Cours & Supports",
          children: [
            { name: "Calcul" },
            { name: "Logique" },
            { name: "Verbal" },
          ],
        },
        { name: "Ressources Globales TageMage" },
        { name: "Tests Blancs & Diagnostics" },
        { name: "Sessions Enregistrées" },
      ],
    },
  },
  // Premium Access - Dossier + Oraux
  {
    name: "PACK_PREMIUM_ACCESS_FRANCE",
    displayName: "Premium Access France",
    description: "Accompagnement complet pour candidatures aux écoles françaises (HEC, ESSEC, ESCP, EDHEC, SKEMA, INSEAD). Stratégie, CV, lettres, essays, préparation oraux.",
    price: 0,
    geography: "France",
    isAddon: false,
    folderTemplate: {
      name: "Pack Dossier France",
      children: [
        { name: "Documents Personnels" },
        { name: "Essays" },
        { name: "CV & Lettres" },
        { name: "Stratégie & Choix Écoles" },
        { name: "Préparation Oraux" },
      ],
    },
  },
  {
    name: "PACK_PREMIUM_ACCESS_UK",
    displayName: "Premium Access UK",
    description: "Accompagnement complet pour candidatures aux écoles britanniques (LBS, Imperial, LSE). Stratégie, CV, lettres, essays, préparation oraux.",
    price: 0,
    geography: "UK",
    isAddon: false,
    folderTemplate: {
      name: "Pack Dossier UK",
      children: [
        { name: "Documents Personnels" },
        { name: "Essays" },
        { name: "CV & Lettres" },
        { name: "Stratégie & Choix Écoles" },
        { name: "Préparation Oraux" },
      ],
    },
  },
  // Oral Mastery - Préparation Oraux Seulement
  {
    name: "PACK_ORAL_MASTERY_FRANCE",
    displayName: "Oral Mastery France",
    description: "Préparation oraux uniquement pour écoles françaises. Simulations d'entretiens, coaching personnalisé.",
    price: 0,
    geography: "France",
    isAddon: false,
    folderTemplate: {
      name: "Pack Oraux France",
      children: [
        { name: "Préparation Discours" },
        { name: "Simulations" },
        { name: "Banque Questions" },
        { name: "Feedback Sessions" },
      ],
    },
  },
  {
    name: "PACK_ORAL_MASTERY_UK",
    displayName: "Oral Mastery UK",
    description: "Préparation oraux uniquement pour écoles britanniques. Simulations d'entretiens, coaching personnalisé.",
    price: 0,
    geography: "UK",
    isAddon: false,
    folderTemplate: {
      name: "Pack Oraux UK",
      children: [
        { name: "Préparation Discours" },
        { name: "Simulations" },
        { name: "Banque Questions" },
        { name: "Feedback Sessions" },
      ],
    },
  },
  // Add-ons - Géographies supplémentaires
  {
    name: "ADDON_ESPAGNE",
    displayName: "Add-on Espagne",
    description: "Add-on pour candidatures aux écoles espagnoles (IE, ESADE, IESE). Essays, préparation oraux.",
    price: 0,
    geography: "Espagne",
    isAddon: true,
    folderTemplate: {
      name: "Add-on Espagne",
      children: [
        { name: "Essays" },
        { name: "Préparation Oraux" },
        { name: "Ressources Espagne" },
      ],
    },
  },
  {
    name: "ADDON_ITALIE",
    displayName: "Add-on Italie",
    description: "Add-on pour candidatures aux écoles italiennes (Bocconi). Essays, préparation oraux.",
    price: 0,
    geography: "Italie",
    isAddon: true,
    folderTemplate: {
      name: "Add-on Italie",
      children: [
        { name: "Essays" },
        { name: "Préparation Oraux" },
        { name: "Ressources Italie" },
      ],
    },
  },
  {
    name: "ADDON_ST_GALL",
    displayName: "Add-on St-Gall (Suisse)",
    description: "Add-on pour candidatures à l'Université de St-Gall (HSG). Essays, préparation oraux.",
    price: 0,
    geography: "Suisse",
    isAddon: true,
    folderTemplate: {
      name: "Add-on St-Gall",
      children: [
        { name: "Essays" },
        { name: "Préparation Oraux" },
        { name: "Ressources HSG" },
      ],
    },
  },
];

// =============================================
// SEED FUNCTIONS
// =============================================

export async function seedSchools() {
  console.log("🏫 Seeding schools and programs...");
  
  for (const schoolData of schoolsData) {
    const existingSchool = await prisma.school.findFirst({
      where: { name: schoolData.name },
    });
    
    if (existingSchool) {
      console.log(`  ⏭️  Skipping ${schoolData.name} (already exists)`);
      continue;
    }
    
    const school = await prisma.school.create({
      data: {
        name: schoolData.name,
        country: schoolData.country,
        city: schoolData.city,
        website: schoolData.website,
        programs: {
          create: schoolData.programs.map((p) => ({
            name: p.name,
            type: p.type,
            duration: p.duration,
            degree: p.degree,
          })),
        },
      },
    });
    
    console.log(`  ✅ Created ${school.name} with ${schoolData.programs.length} programs`);
  }
  
  console.log("🏫 Schools seeding complete!");
}

export async function seedPacks() {
  console.log("📦 Seeding packs...");
  
  for (const packData of packsData) {
    const existingPack = await prisma.pack.findUnique({
      where: { name: packData.name },
    });
    
    if (existingPack) {
      console.log(`  ⏭️  Skipping ${packData.displayName} (already exists)`);
      continue;
    }
    
    const pack = await prisma.pack.create({
      data: {
        name: packData.name,
        displayName: packData.displayName,
        description: packData.description,
        price: packData.price,
        geography: packData.geography,
        isAddon: packData.isAddon,
        folderTemplate: packData.folderTemplate,
      },
    });
    
    console.log(`  ✅ Created pack: ${pack.displayName}${pack.isAddon ? " (Add-on)" : ""}`);
  }
  
  console.log("📦 Packs seeding complete!");
}

export async function seedAll() {
  await seedSchools();
  await seedPacks();
}

// Run if called directly
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log("\n🎉 All seeding complete!");
      process.exit(0);
    })
    .catch((e) => {
      console.error("❌ Seeding failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

