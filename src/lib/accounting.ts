import { prisma } from "@/lib/db/prisma";

/**
 * Genere un numero de transaction unique au format TXN-YYYY-NNNNN
 * Exemple: TXN-2025-00001
 */
export async function generateTransactionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `TXN-${year}-`;

  // Trouver la derniere transaction de l'annee
  const lastTransaction = await prisma.transaction.findFirst({
    where: {
      transactionNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      transactionNumber: "desc",
    },
    select: {
      transactionNumber: true,
    },
  });

  let nextNumber = 1;
  if (lastTransaction) {
    const lastNumber = parseInt(
      lastTransaction.transactionNumber.replace(prefix, ""),
      10
    );
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
}

/**
 * Genere un numero de devis unique au format QUOTE-YYYY-NNN
 * Exemple: QUOTE-2025-001
 */
export async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `QUOTE-${year}-`;

  const lastQuote = await prisma.quote.findFirst({
    where: {
      quoteNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      quoteNumber: "desc",
    },
    select: {
      quoteNumber: true,
    },
  });

  let nextNumber = 1;
  if (lastQuote) {
    const lastNumber = parseInt(lastQuote.quoteNumber.replace(prefix, ""), 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(3, "0")}`;
}

/**
 * Types de transactions disponibles
 */
export const TransactionTypes = {
  STUDENT_PAYMENT: "STUDENT_PAYMENT",
  MENTOR_PAYMENT: "MENTOR_PAYMENT",
  PROFESSOR_PAYMENT: "PROFESSOR_PAYMENT",
  EXPENSE: "EXPENSE",
  DISTRIBUTION: "DISTRIBUTION",
  TRANSFER: "TRANSFER",
  FX_EXCHANGE: "FX_EXCHANGE",
} as const;

export type TransactionType = (typeof TransactionTypes)[keyof typeof TransactionTypes];

/**
 * Labels pour les types de transactions
 */
export const TransactionTypeLabels: Record<TransactionType, string> = {
  STUDENT_PAYMENT: "Paiement etudiant",
  MENTOR_PAYMENT: "Paiement mentor",
  PROFESSOR_PAYMENT: "Paiement professeur",
  EXPENSE: "Charge",
  DISTRIBUTION: "Distribution",
  TRANSFER: "Transfert",
  FX_EXCHANGE: "Change de devise",
};

/**
 * Devises supportees
 */
export const Currencies = ["EUR", "MAD", "USD"] as const;
export type Currency = (typeof Currencies)[number];

/**
 * Symboles des devises
 */
export const CurrencySymbols: Record<Currency, string> = {
  EUR: "EUR",
  MAD: "MAD",
  USD: "USD",
};

/**
 * Formate un montant en centimes vers une devise lisible
 */
export function formatAccountingAmount(
  amountInCents: number,
  currency: Currency
): string {
  const amount = amountInCents / 100;
  const formatted = amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${CurrencySymbols[currency]}`;
}

/**
 * Convertit un montant decimal en centimes
 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convertit un montant en centimes vers decimal
 */
export function fromCents(amountInCents: number): number {
  return amountInCents / 100;
}

/**
 * Cree une transaction dans le journal
 */
export interface CreateTransactionParams {
  date: Date;
  type: TransactionType;
  amount: number; // En centimes
  currency: Currency;
  sourceAccountId?: string;
  destinationAccountId?: string;
  paymentId?: string;
  expenseId?: string;
  distributionId?: string;
  missionId?: string;
  quoteId?: string;
  paymentScheduleId?: string;
  studentId?: string;
  mentorId?: string;
  professorId?: string;
  linkedTransactionId?: string;
  exchangeRate?: number;
  fxFees?: number;
  description?: string;
  notes?: string;
  createdBy: string;
}

export async function createTransaction(
  params: CreateTransactionParams
): Promise<{ id: string; transactionNumber: string }> {
  const transactionNumber = await generateTransactionNumber();

  const transaction = await prisma.transaction.create({
    data: {
      transactionNumber,
      date: params.date,
      type: params.type,
      amount: params.amount,
      currency: params.currency,
      sourceAccountId: params.sourceAccountId || null,
      destinationAccountId: params.destinationAccountId || null,
      paymentId: params.paymentId || null,
      expenseId: params.expenseId || null,
      distributionId: params.distributionId || null,
      missionId: params.missionId || null,
      quoteId: params.quoteId || null,
      paymentScheduleId: params.paymentScheduleId || null,
      studentId: params.studentId || null,
      mentorId: params.mentorId || null,
      professorId: params.professorId || null,
      linkedTransactionId: params.linkedTransactionId || null,
      exchangeRate: params.exchangeRate || null,
      fxFees: params.fxFees || null,
      description: params.description || null,
      notes: params.notes || null,
      createdBy: params.createdBy,
    },
    select: {
      id: true,
      transactionNumber: true,
    },
  });

  return transaction;
}

/**
 * Cree une paire de transactions pour un change de devise
 * Retourne les deux transactions liees
 */
export async function createFxExchangeTransactions(params: {
  date: Date;
  fromAmount: number; // En centimes
  fromCurrency: Currency;
  fromAccountId: string;
  toAmount: number; // En centimes
  toCurrency: Currency;
  toAccountId: string;
  exchangeRate: number;
  fxFees?: number;
  description?: string;
  notes?: string;
  createdBy: string;
}): Promise<{ fromTransaction: string; toTransaction: string }> {
  const fromTxnNumber = await generateTransactionNumber();

  // Creer la transaction de sortie (debit du compte source)
  const fromTransaction = await prisma.transaction.create({
    data: {
      transactionNumber: fromTxnNumber,
      date: params.date,
      type: "FX_EXCHANGE",
      amount: params.fromAmount,
      currency: params.fromCurrency,
      sourceAccountId: params.fromAccountId,
      exchangeRate: params.exchangeRate,
      fxFees: params.fxFees || null,
      description:
        params.description ||
        `Change ${params.fromCurrency} -> ${params.toCurrency}`,
      notes: params.notes || null,
      createdBy: params.createdBy,
    },
  });

  const toTxnNumber = await generateTransactionNumber();

  // Creer la transaction d'entree (credit du compte destination)
  const toTransaction = await prisma.transaction.create({
    data: {
      transactionNumber: toTxnNumber,
      date: params.date,
      type: "FX_EXCHANGE",
      amount: params.toAmount,
      currency: params.toCurrency,
      destinationAccountId: params.toAccountId,
      linkedTransactionId: fromTransaction.id,
      exchangeRate: params.exchangeRate,
      description:
        params.description ||
        `Change ${params.fromCurrency} -> ${params.toCurrency}`,
      notes: params.notes || null,
      createdBy: params.createdBy,
    },
  });

  return {
    fromTransaction: fromTransaction.id,
    toTransaction: toTransaction.id,
  };
}

/**
 * Calcule le solde d'un compte bancaire
 */
export async function calculateAccountBalance(
  accountId: string
): Promise<number> {
  const [incoming, outgoing] = await Promise.all([
    prisma.transaction.aggregate({
      where: { destinationAccountId: accountId },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { sourceAccountId: accountId },
      _sum: { amount: true },
    }),
  ]);

  return (incoming._sum.amount || 0) - (outgoing._sum.amount || 0);
}

/**
 * Calcule les soldes de tous les comptes par devise
 */
export async function calculateTotalsByCurrency(): Promise<
  Record<Currency, number>
> {
  const accounts = await prisma.bankAccount.findMany({
    where: { isActive: true },
    select: { id: true, currency: true },
  });

  const totals: Record<string, number> = { EUR: 0, MAD: 0, USD: 0 };

  for (const account of accounts) {
    const balance = await calculateAccountBalance(account.id);
    totals[account.currency] = (totals[account.currency] || 0) + balance;
  }

  return totals as Record<Currency, number>;
}

/**
 * Valide qu'une devise correspond a celle d'un compte
 */
export async function validateAccountCurrency(
  accountId: string,
  expectedCurrency: Currency
): Promise<boolean> {
  const account = await prisma.bankAccount.findUnique({
    where: { id: accountId },
    select: { currency: true, isActive: true },
  });

  if (!account || !account.isActive) {
    return false;
  }

  return account.currency === expectedCurrency;
}

/**
 * Statuts d'echeance
 */
export const PaymentScheduleStatuses = {
  PENDING: "PENDING",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
} as const;

export type PaymentScheduleStatus =
  (typeof PaymentScheduleStatuses)[keyof typeof PaymentScheduleStatuses];

/**
 * Calcule le statut d'une echeance
 */
export function calculateScheduleStatus(
  paidAmount: number,
  totalAmount: number,
  dueDate: Date
): PaymentScheduleStatus {
  if (paidAmount >= totalAmount) {
    return "PAID";
  }
  if (paidAmount > 0) {
    return "PARTIAL";
  }
  if (new Date() > dueDate) {
    return "OVERDUE";
  }
  return "PENDING";
}
