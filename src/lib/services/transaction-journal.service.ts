import { prisma } from "../db/prisma";
import { generateTransactionNumber, createTransaction, createFxExchangeTransactions } from "../accounting";
import type { Transaction } from "@prisma/client";
import type { Payment, Expense, Mission, PaymentAllocation } from "@prisma/client";

/**
 * Service de gestion du journal comptable
 * 
 * Responsabilités:
 * - Créer des écritures comptables automatiquement
 * - Lier les transactions aux opérations sources
 * - Gérer les transactions FX (change de devise)
 * - Générer des numéros de transaction uniques
 */
export class TransactionJournalService {
    /**
     * Crée une écriture pour un paiement étudiant
     * 
     * Type: STUDENT_PAYMENT
     * Source: null (entrée d'argent)
     * Destination: compte bancaire de réception
     * 
     * @param payment - Paiement reçu
     * @param allocations - Allocations du paiement
     * @param createdBy - ID de l'utilisateur créateur
     * @returns Transaction créée
     */
    async createPaymentTransaction(
        payment: Payment & { allocations?: PaymentAllocation[] },
        createdBy: string
    ): Promise<Transaction> {
        if (!payment.bankAccountId) {
            throw new Error("Payment must have a receiving bank account");
        }

        // Déterminer le type de transaction
        let type = "STUDENT_PAYMENT";
        if (payment.mentorId) type = "MENTOR_PAYMENT";
        else if (payment.professorId) type = "PROFESSOR_PAYMENT";

        // Créer la transaction
        const transaction = await createTransaction({
            date: payment.paymentDate,
            type: type as any,
            amount: payment.amount,
            currency: payment.currency as any,
            destinationAccountId: payment.bankAccountId,
            paymentId: payment.id,
            studentId: payment.studentId || undefined,
            mentorId: payment.mentorId || undefined,
            professorId: payment.professorId || undefined,
            description: `Paiement reçu - ${payment.currency} ${payment.amount / 100}`,
            notes: payment.notes || undefined,
            createdBy,
        });

        return prisma.transaction.findUniqueOrThrow({
            where: { id: transaction.id },
        });
    }

    /**
     * Crée une écriture pour une charge
     * 
     * Type: EXPENSE
     * Source: compte bancaire payeur
     * Destination: null (sortie d'argent)
     * 
     * @param expense - Charge payée
     * @param createdBy - ID de l'utilisateur créateur
     * @returns Transaction créée
     */
    async createExpenseTransaction(
        expense: Expense,
        createdBy: string
    ): Promise<Transaction> {
        if (!expense.payingAccountId) {
            throw new Error("Expense must have a paying account");
        }

        const transaction = await createTransaction({
            date: expense.expenseDate,
            type: "EXPENSE",
            amount: expense.amount,
            currency: expense.currency as any,
            sourceAccountId: expense.payingAccountId,
            expenseId: expense.id,
            studentId: expense.studentId || undefined,
            description: expense.description || `Charge - ${expense.category}`,
            notes: expense.supplier ? `Fournisseur: ${expense.supplier}` : undefined,
            createdBy,
        });

        return prisma.transaction.findUniqueOrThrow({
            where: { id: transaction.id },
        });
    }

    /**
     * Crée une écriture pour un paiement de mission (mentor/prof)
     * 
     * Type: MENTOR_PAYMENT ou PROFESSOR_PAYMENT
     * Source: compte bancaire payeur
     * Destination: null (sortie d'argent)
     * 
     * @param mission - Mission payée
     * @param paymentAccountId - ID du compte bancaire payeur
     * @param createdBy - ID de l'utilisateur créateur
     * @returns Transaction créée
     */
    async createMissionPaymentTransaction(
        mission: Mission,
        paymentAccountId: string,
        createdBy: string
    ): Promise<Transaction> {
        if (mission.status !== "VALIDATED") {
            throw new Error("Cannot create transaction for non-validated mission");
        }

        const type = mission.mentorId ? "MENTOR_PAYMENT" : "PROFESSOR_PAYMENT";

        const transaction = await createTransaction({
            date: new Date(),
            type: type as any,
            amount: mission.amount,
            currency: mission.currency as any,
            sourceAccountId: paymentAccountId,
            missionId: mission.id,
            mentorId: mission.mentorId || undefined,
            professorId: mission.professorId || undefined,
            studentId: mission.studentId || undefined,
            description: mission.title,
            notes: mission.notes || undefined,
            createdBy,
        });

        return prisma.transaction.findUniqueOrThrow({
            where: { id: transaction.id },
        });
    }

    /**
     * Crée deux écritures liées pour un change de devise
     * 
     * Type: FX_EXCHANGE (pour les deux transactions)
     * Transaction 1: Sortie de la devise source
     * Transaction 2: Entrée de la devise destination (liée à la 1)
     * 
     * @param params - Paramètres du change
     * @returns Les deux transactions créées
     */
    async createFXTransactions(params: {
        sourceAccountId: string;
        destinationAccountId: string;
        sourceAmount: number; // En centimes
        sourceCurrency: "EUR" | "MAD" | "USD";
        destinationAmount: number; // En centimes
        destinationCurrency: "EUR" | "MAD" | "USD";
        exchangeRate: number;
        fxFees?: number; // En centimes
        date?: Date;
        notes?: string;
        createdBy: string;
    }): Promise<{ fromTransaction: Transaction; toTransaction: Transaction }> {
        // Valider que les devises sont différentes
        if (params.sourceCurrency === params.destinationCurrency) {
            throw new Error("FX exchange requires different currencies. Use createTransferTransaction for same currency.");
        }

        // Valider que les comptes existent et ont les bonnes devises
        const [sourceAccount, destAccount] = await Promise.all([
            prisma.bankAccount.findUnique({
                where: { id: params.sourceAccountId },
                select: { currency: true, isActive: true },
            }),
            prisma.bankAccount.findUnique({
                where: { id: params.destinationAccountId },
                select: { currency: true, isActive: true },
            }),
        ]);

        if (!sourceAccount || !sourceAccount.isActive) {
            throw new Error("Source account not found or inactive");
        }

        if (!destAccount || !destAccount.isActive) {
            throw new Error("Destination account not found or inactive");
        }

        if (sourceAccount.currency !== params.sourceCurrency) {
            throw new Error(`Source account currency (${sourceAccount.currency}) does not match source currency (${params.sourceCurrency})`);
        }

        if (destAccount.currency !== params.destinationCurrency) {
            throw new Error(`Destination account currency (${destAccount.currency}) does not match destination currency (${params.destinationCurrency})`);
        }

        // Créer les deux transactions liées
        const result = await createFxExchangeTransactions({
            date: params.date || new Date(),
            fromAmount: params.sourceAmount,
            fromCurrency: params.sourceCurrency,
            fromAccountId: params.sourceAccountId,
            toAmount: params.destinationAmount,
            toCurrency: params.destinationCurrency,
            toAccountId: params.destinationAccountId,
            exchangeRate: params.exchangeRate,
            fxFees: params.fxFees,
            notes: params.notes,
            createdBy: params.createdBy,
        });

        // Récupérer les transactions complètes
        const [fromTransaction, toTransaction] = await Promise.all([
            prisma.transaction.findUniqueOrThrow({
                where: { id: result.fromTransaction },
            }),
            prisma.transaction.findUniqueOrThrow({
                where: { id: result.toTransaction },
            }),
        ]);

        return { fromTransaction, toTransaction };
    }

    /**
     * Crée une écriture pour un transfert (même devise)
     * 
     * Type: TRANSFER
     * Source: compte source
     * Destination: compte destination
     * 
     * @param params - Paramètres du transfert
     * @returns Transaction créée
     */
    async createTransferTransaction(params: {
        sourceAccountId: string;
        destinationAccountId: string;
        amount: number; // En centimes
        currency: "EUR" | "MAD" | "USD";
        date?: Date;
        notes?: string;
        createdBy: string;
    }): Promise<Transaction> {
        // Valider que les comptes existent et ont la bonne devise
        const [sourceAccount, destAccount] = await Promise.all([
            prisma.bankAccount.findUnique({
                where: { id: params.sourceAccountId },
                select: { currency: true, isActive: true },
            }),
            prisma.bankAccount.findUnique({
                where: { id: params.destinationAccountId },
                select: { currency: true, isActive: true },
            }),
        ]);

        if (!sourceAccount || !sourceAccount.isActive) {
            throw new Error("Source account not found or inactive");
        }

        if (!destAccount || !destAccount.isActive) {
            throw new Error("Destination account not found or inactive");
        }

        if (sourceAccount.currency !== params.currency) {
            throw new Error(`Source account currency (${sourceAccount.currency}) does not match transfer currency (${params.currency})`);
        }

        if (destAccount.currency !== params.currency) {
            throw new Error(`Destination account currency (${destAccount.currency}) does not match transfer currency (${params.currency})`);
        }

        const transaction = await createTransaction({
            date: params.date || new Date(),
            type: "TRANSFER",
            amount: params.amount,
            currency: params.currency,
            sourceAccountId: params.sourceAccountId,
            destinationAccountId: params.destinationAccountId,
            description: `Transfert ${params.currency} ${params.amount / 100}`,
            notes: params.notes,
            createdBy: params.createdBy,
        });

        return prisma.transaction.findUniqueOrThrow({
            where: { id: transaction.id },
        });
    }

    /**
     * Crée une écriture pour une distribution
     * 
     * Type: DISTRIBUTION
     * Source: compte source
     * Destination: null (distribution aux fondateurs)
     * 
     * @param distributionId - ID de la distribution
     * @param sourceAccountId - ID du compte source
     * @param amount - Montant en centimes
     * @param currency - Devise
     * @param createdBy - ID de l'utilisateur créateur
     * @returns Transaction créée
     */
    async createDistributionTransaction(
        distributionId: string,
        sourceAccountId: string,
        amount: number,
        currency: "EUR" | "MAD" | "USD",
        createdBy: string
    ): Promise<Transaction> {
        const transaction = await createTransaction({
            date: new Date(),
            type: "DISTRIBUTION",
            amount,
            currency,
            sourceAccountId,
            distributionId,
            description: `Distribution ${currency} ${amount / 100}`,
            createdBy,
        });

        return prisma.transaction.findUniqueOrThrow({
            where: { id: transaction.id },
        });
    }

    /**
     * Récupère toutes les transactions avec filtres
     * 
     * @param filters - Filtres de recherche
     * @returns Liste des transactions
     */
    async getTransactions(filters: {
        startDate?: Date;
        endDate?: Date;
        currency?: string;
        type?: string;
        accountId?: string;
        studentId?: string;
        mentorId?: string;
        professorId?: string;
        limit?: number;
        offset?: number;
    }) {
        const where: any = {};

        if (filters.startDate || filters.endDate) {
            where.date = {};
            if (filters.startDate) where.date.gte = filters.startDate;
            if (filters.endDate) where.date.lte = filters.endDate;
        }

        if (filters.currency) where.currency = filters.currency;
        if (filters.type) where.type = filters.type;
        if (filters.studentId) where.studentId = filters.studentId;
        if (filters.mentorId) where.mentorId = filters.mentorId;
        if (filters.professorId) where.professorId = filters.professorId;

        if (filters.accountId) {
            where.OR = [
                { sourceAccountId: filters.accountId },
                { destinationAccountId: filters.accountId },
            ];
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    sourceAccount: {
                        select: {
                            id: true,
                            accountName: true,
                            currency: true,
                        },
                    },
                    destinationAccount: {
                        select: {
                            id: true,
                            accountName: true,
                            currency: true,
                        },
                    },
                    student: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    mentor: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    professor: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
                orderBy: {
                    date: "desc",
                },
                take: filters.limit || 50,
                skip: filters.offset || 0,
            }),
            prisma.transaction.count({ where }),
        ]);

        return {
            transactions,
            total,
            hasMore: (filters.offset || 0) + transactions.length < total,
        };
    }
}

// Export singleton instance
export const transactionJournalService = new TransactionJournalService();
