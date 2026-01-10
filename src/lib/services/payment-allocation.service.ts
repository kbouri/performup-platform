import { prisma } from "@/lib/db/prisma";
import { calculateScheduleStatus } from "@/lib/accounting";
import type {
    AllocationSuggestion,
    AllocationInput,
    AllocationResult,
    AllocationSuggestionOptions,
    AllocationStats,
} from "@/lib/types/accounting.types";
import type { PaymentSchedule, PaymentAllocation } from "@prisma/client";

/**
 * Service de gestion de l'allocation des paiements aux échéances
 * 
 * Responsabilités:
 * - Suggérer une allocation automatique intelligente
 * - Créer des allocations de paiements
 * - Mettre à jour les statuts des échéances
 * - Calculer les montants restants
 */
export class PaymentAllocationService {
    /**
     * Suggère une allocation automatique pour un paiement
     * 
     * Règles de priorisation:
     * 1. Échéances en retard (OVERDUE) - priorité 1
     * 2. Échéances partiellement payées (PARTIAL) - priorité 2
     * 3. Échéances à venir (PENDING) - priorité 3
     * 4. Tri par date (plus anciennes en premier)
     * 
     * @param paymentId - ID du paiement
     * @param options - Options de filtrage
     * @returns Liste de suggestions d'allocation
     */
    async suggestAllocation(
        paymentId: string,
        options: AllocationSuggestionOptions = {}
    ): Promise<AllocationSuggestion[]> {
        // Récupérer le paiement
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                allocations: true,
            },
        });

        if (!payment) {
            throw new Error(`Payment ${paymentId} not found`);
        }

        // Calculer le montant déjà alloué
        const alreadyAllocated = payment.allocations.reduce(
            (sum, alloc) => sum + alloc.amount,
            0
        );

        const remainingAmount = payment.amount - alreadyAllocated;

        if (remainingAmount <= 0) {
            return []; // Paiement déjà entièrement alloué
        }

        // Construire les filtres pour les échéances
        const where: Record<string, unknown> = {
            status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
            currency: payment.currency, // Même devise
        };

        // Filtres optionnels
        if (payment.studentId) where.studentId = payment.studentId;
        if (payment.mentorId) where.mentorId = payment.mentorId;
        if (payment.professorId) where.professorId = payment.professorId;
        if (options.studentId) where.studentId = options.studentId;
        if (options.mentorId) where.mentorId = options.mentorId;
        if (options.professorId) where.professorId = options.professorId;
        if (options.currency) where.currency = options.currency;

        // Récupérer les échéances éligibles
        const schedules = await prisma.paymentSchedule.findMany({
            where,
            include: {
                allocations: true,
            },
            orderBy: {
                dueDate: "asc", // Plus anciennes en premier
            },
        });

        // Calculer les suggestions
        const suggestions: AllocationSuggestion[] = [];
        let amountToAllocate = remainingAmount;

        for (const schedule of schedules) {
            if (amountToAllocate <= 0) break;

            // Calculer le montant restant pour cette échéance
            const totalAllocated = schedule.allocations.reduce(
                (sum, alloc) => sum + alloc.amount,
                0
            );
            const remainingForSchedule = schedule.amount - totalAllocated;

            if (remainingForSchedule <= 0) continue; // Échéance déjà payée

            // Calculer la priorité
            let priority = 3; // PENDING par défaut
            if (schedule.status === "OVERDUE") priority = 1;
            else if (schedule.status === "PARTIAL") priority = 2;

            // Montant suggéré: minimum entre ce qui reste à allouer et ce qui reste pour l'échéance
            const suggestedAmount = Math.min(amountToAllocate, remainingForSchedule);

            suggestions.push({
                scheduleId: schedule.id,
                scheduleDueDate: schedule.dueDate,
                scheduleAmount: schedule.amount,
                schedulePaidAmount: totalAllocated,
                scheduleRemainingAmount: remainingForSchedule,
                suggestedAllocation: suggestedAmount,
                priority,
                scheduleStatus: schedule.status,
            });

            amountToAllocate -= suggestedAmount;
        }

        // Trier par priorité (1 = plus haute)
        return suggestions.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Alloue un paiement à des échéances
     * 
     * Valide:
     * - Somme des allocations ≤ montant du paiement
     * - Devise compatible
     * - Échéances non déjà payées
     * 
     * @param paymentId - ID du paiement
     * @param allocations - Liste des allocations à créer
     * @returns Résultat de l'allocation
     */
    async allocatePayment(
        paymentId: string,
        allocations: AllocationInput[]
    ): Promise<AllocationResult> {
        // Récupérer le paiement
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                allocations: true,
            },
        });

        if (!payment) {
            throw new Error(`Payment ${paymentId} not found`);
        }

        // Calculer le montant déjà alloué
        const alreadyAllocated = payment.allocations.reduce(
            (sum, alloc) => sum + alloc.amount,
            0
        );

        // Calculer le total des nouvelles allocations
        const totalNewAllocations = allocations.reduce(
            (sum, alloc) => sum + alloc.amount,
            0
        );

        // Validation: total ne doit pas dépasser le montant du paiement
        if (alreadyAllocated + totalNewAllocations > payment.amount) {
            throw new Error(
                `Total allocations (${alreadyAllocated + totalNewAllocations}) exceed payment amount (${payment.amount})`
            );
        }

        // Créer les allocations et mettre à jour les échéances
        const createdAllocations: PaymentAllocation[] = [];
        const updatedSchedules: PaymentSchedule[] = [];

        for (const allocationInput of allocations) {
            // Récupérer l'échéance
            const schedule = await prisma.paymentSchedule.findUnique({
                where: { id: allocationInput.scheduleId },
                include: {
                    allocations: true,
                },
            });

            if (!schedule) {
                throw new Error(`Schedule ${allocationInput.scheduleId} not found`);
            }

            // Validation: devise compatible
            if (schedule.currency !== payment.currency) {
                throw new Error(
                    `Schedule currency (${schedule.currency}) does not match payment currency (${payment.currency})`
                );
            }

            // Calculer le montant déjà payé pour cette échéance
            const totalPaid = schedule.allocations.reduce(
                (sum, alloc) => sum + alloc.amount,
                0
            );

            // Validation: ne pas dépasser le montant de l'échéance
            if (totalPaid + allocationInput.amount > schedule.amount) {
                throw new Error(
                    `Allocation amount (${allocationInput.amount}) exceeds schedule remaining amount (${schedule.amount - totalPaid})`
                );
            }

            // Créer l'allocation
            const allocation = await prisma.paymentAllocation.create({
                data: {
                    paymentId,
                    scheduleId: allocationInput.scheduleId,
                    amount: allocationInput.amount,
                    currency: payment.currency,
                },
            });

            createdAllocations.push(allocation);

            // Mettre à jour le statut de l'échéance
            const updatedSchedule = await this.updateScheduleStatus(
                allocationInput.scheduleId
            );
            updatedSchedules.push(updatedSchedule);
        }

        return {
            allocations: createdAllocations,
            updatedSchedules,
        };
    }

    /**
     * Met à jour le statut d'une échéance basé sur les allocations
     * 
     * PENDING → PARTIAL → PAID
     * Vérifie aussi si OVERDUE
     * 
     * @param scheduleId - ID de l'échéance
     * @returns Échéance mise à jour
     */
    async updateScheduleStatus(scheduleId: string): Promise<PaymentSchedule> {
        const schedule = await prisma.paymentSchedule.findUnique({
            where: { id: scheduleId },
            include: {
                allocations: true,
            },
        });

        if (!schedule) {
            throw new Error(`Schedule ${scheduleId} not found`);
        }

        // Calculer le montant total payé
        const totalPaid = schedule.allocations.reduce(
            (sum, alloc) => sum + alloc.amount,
            0
        );

        // Calculer le nouveau statut
        const newStatus = calculateScheduleStatus(
            totalPaid,
            schedule.amount,
            schedule.dueDate
        );

        // Mettre à jour l'échéance
        const updatedSchedule = await prisma.paymentSchedule.update({
            where: { id: scheduleId },
            data: {
                paidAmount: totalPaid,
                status: newStatus,
                paidDate: newStatus === "PAID" ? new Date() : null,
            },
        });

        return updatedSchedule;
    }

    /**
     * Calcule le montant restant à payer pour une échéance
     * 
     * @param scheduleId - ID de l'échéance
     * @returns Montant restant en centimes
     */
    async getRemainingAmount(scheduleId: string): Promise<number> {
        const schedule = await prisma.paymentSchedule.findUnique({
            where: { id: scheduleId },
            include: {
                allocations: true,
            },
        });

        if (!schedule) {
            throw new Error(`Schedule ${scheduleId} not found`);
        }

        const totalPaid = schedule.allocations.reduce(
            (sum, alloc) => sum + alloc.amount,
            0
        );

        return schedule.amount - totalPaid;
    }

    /**
     * Calcule les statistiques d'allocation pour un paiement
     * 
     * @param paymentId - ID du paiement
     * @returns Statistiques d'allocation
     */
    async getAllocationStats(paymentId: string): Promise<AllocationStats> {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                allocations: {
                    include: {
                        schedule: true,
                    },
                },
            },
        });

        if (!payment) {
            throw new Error(`Payment ${paymentId} not found`);
        }

        const totalAllocated = payment.allocations.reduce(
            (sum, alloc) => sum + alloc.amount,
            0
        );

        const remainingAmount = payment.amount - totalAllocated;

        // Compter les échéances entièrement/partiellement payées
        const scheduleIds = new Set(payment.allocations.map((a) => a.scheduleId));
        let schedulesFullyPaid = 0;
        let schedulesPartiallyPaid = 0;

        for (const scheduleId of scheduleIds) {
            const schedule = payment.allocations.find(
                (a) => a.scheduleId === scheduleId
            )?.schedule;
            if (schedule) {
                if (schedule.status === "PAID") schedulesFullyPaid++;
                else if (schedule.status === "PARTIAL") schedulesPartiallyPaid++;
            }
        }

        return {
            totalAllocated,
            remainingAmount,
            schedulesFullyPaid,
            schedulesPartiallyPaid,
        };
    }
}

// Export singleton instance
export const paymentAllocationService = new PaymentAllocationService();
