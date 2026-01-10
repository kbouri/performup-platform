import { prisma } from "../db/prisma";
import { validateAccountCurrency as validateAccountCurrencyUtil } from "../accounting";
import type { Payment, Mission, BankAccount } from "@prisma/client";

/**
 * Niveau d'alerte
 */
export enum AlertLevel {
    INFO = "INFO",
    WARNING = "WARNING",
    ERROR = "ERROR",
}

/**
 * Type d'alerte
 */
export interface Alert {
    level: AlertLevel;
    type: string;
    message: string;
    data?: Record<string, unknown>;
}

/**
 * Service de validation métier
 * 
 * Responsabilités:
 * - Valider les opérations avant enregistrement
 * - Bloquer les opérations invalides
 * - Générer des alertes pour opérations suspectes
 * - Détecter les doublons potentiels
 */
export class ValidationService {
    /**
     * Valide qu'un compte peut recevoir/envoyer un paiement dans une devise
     * 
     * @param accountId - ID du compte
     * @param currency - Devise attendue
     * @throws Error si la devise ne correspond pas ou le compte est inactif
     */
    async validateAccountCurrency(
        accountId: string,
        currency: string
    ): Promise<void> {
        const isValid = await validateAccountCurrencyUtil(accountId, currency as "EUR" | "MAD" | "USD");

        if (!isValid) {
            const account = await prisma.bankAccount.findUnique({
                where: { id: accountId },
                select: { currency: true, isActive: true, accountName: true },
            });

            if (!account) {
                throw new Error(`Account ${accountId} not found`);
            }

            if (!account.isActive) {
                throw new Error(`Account "${account.accountName}" is inactive`);
            }

            throw new Error(
                `Account "${account.accountName}" currency (${account.currency}) does not match expected currency (${currency})`
            );
        }
    }

    /**
     * Valide qu'un paiement a un compte de réception
     * 
     * @param payment - Paiement à valider
     * @throws Error si le paiement n'a pas de compte
     */
    validatePaymentAccount(payment: Partial<Payment>): void {
        if (!payment.bankAccountId) {
            throw new Error("Payment must have a receiving bank account (bankAccountId is required)");
        }
    }

    /**
     * Valide que les allocations ne dépassent pas le montant du paiement
     * 
     * @param paymentAmount - Montant du paiement en centimes
     * @param allocations - Liste des allocations
     * @throws Error si le total dépasse le montant du paiement
     */
    validateAllocationAmount(
        paymentAmount: number,
        allocations: Array<{ amount: number }>
    ): void {
        const totalAllocations = allocations.reduce(
            (sum, alloc) => sum + alloc.amount,
            0
        );

        if (totalAllocations > paymentAmount) {
            throw new Error(
                `Total allocations (${totalAllocations / 100} ${""}) exceed payment amount (${paymentAmount / 100})`
            );
        }
    }

    /**
     * Valide qu'une mission peut être payée
     * 
     * @param mission - Mission à valider
     * @throws Error si la mission ne peut pas être payée
     */
    validateMissionPayment(mission: Mission): void {
        if (mission.status !== "VALIDATED") {
            throw new Error(
                `Cannot pay mission "${mission.title}" - status must be VALIDATED (current: ${mission.status})`
            );
        }

        if (mission.paidAt) {
            throw new Error(
                `Mission "${mission.title}" has already been paid on ${mission.paidAt.toISOString()}`
            );
        }
    }

    /**
     * Détecte les paiements en double potentiels
     * 
     * Critères de détection:
     * - Même étudiant/mentor/professeur
     * - Même montant (±5%)
     * - Même date (±24h)
     * 
     * @param studentId - ID de l'étudiant (optionnel)
     * @param mentorId - ID du mentor (optionnel)
     * @param professorId - ID du professeur (optionnel)
     * @param amount - Montant en centimes
     * @param date - Date du paiement
     * @returns Paiement en double potentiel ou null
     */
    async detectDuplicatePayment(
        studentId: string | null,
        mentorId: string | null,
        professorId: string | null,
        amount: number,
        date: Date
    ): Promise<Payment | null> {
        // Calculer la plage de montant (±5%)
        const amountMin = Math.floor(amount * 0.95);
        const amountMax = Math.ceil(amount * 1.05);

        // Calculer la plage de date (±24h)
        const dateMin = new Date(date.getTime() - 24 * 60 * 60 * 1000);
        const dateMax = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        // Construire le filtre
        const where: Record<string, unknown> = {
            amount: {
                gte: amountMin,
                lte: amountMax,
            },
            paymentDate: {
                gte: dateMin,
                lte: dateMax,
            },
        };

        if (studentId) where.studentId = studentId;
        if (mentorId) where.mentorId = mentorId;
        if (professorId) where.professorId = professorId;

        // Chercher un paiement similaire
        const duplicate = await prisma.payment.findFirst({
            where,
            orderBy: {
                createdAt: "desc",
            },
        });

        return duplicate;
    }

    /**
     * Génère des alertes pour une opération
     * 
     * @param operation - Type d'opération
     * @param data - Données de l'opération
     * @returns Liste des alertes
     */
    async generateAlerts(
        operation: "PAYMENT" | "EXPENSE" | "MISSION" | "TRANSFER",
        data: Record<string, unknown>
    ): Promise<Alert[]> {
        const alerts: Alert[] = [];

        switch (operation) {
            case "PAYMENT":
                await this.generatePaymentAlerts(data, alerts);
                break;
            case "EXPENSE":
                await this.generateExpenseAlerts(data, alerts);
                break;
            case "MISSION":
                await this.generateMissionAlerts(data, alerts);
                break;
            case "TRANSFER":
                await this.generateTransferAlerts(data, alerts);
                break;
        }

        return alerts;
    }

    /**
     * Génère des alertes pour un paiement
     */
    private async generatePaymentAlerts(
        payment: Partial<Payment> & { studentId?: string; mentorId?: string; professorId?: string },
        alerts: Alert[]
    ): Promise<void> {
        // Alerte: Montant suspect (> 10000€)
        if (payment.amount && payment.amount > 1000000) {
            alerts.push({
                level: AlertLevel.WARNING,
                type: "LARGE_AMOUNT",
                message: `Large payment amount: ${payment.amount / 100} ${payment.currency}`,
                data: { amount: payment.amount, currency: payment.currency },
            });
        }

        // Alerte: Doublon potentiel
        if (payment.amount && payment.paymentDate) {
            const duplicate = await this.detectDuplicatePayment(
                payment.studentId || null,
                payment.mentorId || null,
                payment.professorId || null,
                payment.amount,
                payment.paymentDate
            );

            if (duplicate) {
                alerts.push({
                    level: AlertLevel.WARNING,
                    type: "POTENTIAL_DUPLICATE",
                    message: `Potential duplicate payment detected (similar amount and date within 24h)`,
                    data: {
                        duplicateId: duplicate.id,
                        duplicateAmount: duplicate.amount,
                        duplicateDate: duplicate.paymentDate,
                    },
                });
            }
        }
    }

    /**
     * Génère des alertes pour une charge
     */
    private async generateExpenseAlerts(
        expense: Record<string, unknown>,
        alerts: Alert[]
    ): Promise<void> {
        // Alerte: Charge importante (> 5000€)
        if (expense.amount && expense.amount > 500000) {
            alerts.push({
                level: AlertLevel.WARNING,
                type: "LARGE_EXPENSE",
                message: `Large expense amount: ${expense.amount / 100} ${expense.currency}`,
                data: { amount: expense.amount, currency: expense.currency },
            });
        }

        // Alerte: Charge sans fournisseur
        if (!expense.supplier) {
            alerts.push({
                level: AlertLevel.INFO,
                type: "NO_SUPPLIER",
                message: "Expense has no supplier specified",
            });
        }
    }

    /**
     * Génère des alertes pour une mission
     */
    private async generateMissionAlerts(
        mission: Record<string, unknown>,
        alerts: Alert[]
    ): Promise<void> {
        // Alerte: Mission importante (> 2000€)
        if (mission.amount && mission.amount > 200000) {
            alerts.push({
                level: AlertLevel.INFO,
                type: "LARGE_MISSION",
                message: `Large mission amount: ${mission.amount / 100} ${mission.currency}`,
                data: { amount: mission.amount, currency: mission.currency },
            });
        }

        // Alerte: Mission sans heures travaillées
        if (!mission.hoursWorked) {
            alerts.push({
                level: AlertLevel.INFO,
                type: "NO_HOURS",
                message: "Mission has no hours worked specified",
            });
        }
    }

    /**
     * Génère des alertes pour un transfert
     */
    private async generateTransferAlerts(
        transfer: Record<string, unknown>,
        alerts: Alert[]
    ): Promise<void> {
        // Alerte: Transfert important (> 10000€)
        if (transfer.amount && transfer.amount > 1000000) {
            alerts.push({
                level: AlertLevel.WARNING,
                type: "LARGE_TRANSFER",
                message: `Large transfer amount: ${transfer.amount / 100} ${transfer.currency}`,
                data: { amount: transfer.amount, currency: transfer.currency },
            });
        }
    }

    /**
     * Valide qu'un compte existe et est actif
     * 
     * @param accountId - ID du compte
     * @returns Compte si valide
     * @throws Error si le compte n'existe pas ou est inactif
     */
    async validateAccountExists(accountId: string): Promise<BankAccount> {
        const account = await prisma.bankAccount.findUnique({
            where: { id: accountId },
        });

        if (!account) {
            throw new Error(`Account ${accountId} not found`);
        }

        if (!account.isActive) {
            throw new Error(`Account "${account.accountName}" is inactive`);
        }

        return account;
    }

    /**
     * Valide qu'un montant est positif
     * 
     * @param amount - Montant en centimes
     * @param fieldName - Nom du champ (pour le message d'erreur)
     * @throws Error si le montant est négatif ou zéro
     */
    validatePositiveAmount(amount: number, fieldName: string = "amount"): void {
        if (amount <= 0) {
            throw new Error(`${fieldName} must be positive (got: ${amount})`);
        }
    }

    /**
     * Valide qu'une devise est supportée
     * 
     * @param currency - Devise à valider
     * @throws Error si la devise n'est pas supportée
     */
    validateCurrency(currency: string): void {
        const supportedCurrencies = ["EUR", "MAD", "USD"];
        if (!supportedCurrencies.includes(currency)) {
            throw new Error(
                `Currency "${currency}" is not supported. Supported currencies: ${supportedCurrencies.join(", ")}`
            );
        }
    }
}

// Export singleton instance
export const validationService = new ValidationService();
