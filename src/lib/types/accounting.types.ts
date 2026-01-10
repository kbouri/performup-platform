import type { Payment, PaymentSchedule, PaymentAllocation } from "@prisma/client";

/**
 * Suggestion d'allocation pour un paiement
 */
export interface AllocationSuggestion {
    scheduleId: string;
    scheduleDueDate: Date;
    scheduleAmount: number; // En centimes
    schedulePaidAmount: number; // En centimes
    scheduleRemainingAmount: number; // En centimes
    suggestedAllocation: number; // En centimes
    priority: number; // 1 = highest (overdue), 2 = partial, 3 = pending
    scheduleStatus: string;
}

/**
 * Input pour créer une allocation
 */
export interface AllocationInput {
    scheduleId: string;
    amount: number; // En centimes
}

/**
 * Résultat de l'allocation
 */
export interface AllocationResult {
    allocations: PaymentAllocation[];
    updatedSchedules: PaymentSchedule[];
}

/**
 * Options pour la suggestion d'allocation
 */
export interface AllocationSuggestionOptions {
    /** Limiter aux échéances d'un étudiant spécifique */
    studentId?: string;
    /** Limiter aux échéances d'un mentor spécifique */
    mentorId?: string;
    /** Limiter aux échéances d'un professeur spécifique */
    professorId?: string;
    /** Inclure uniquement les échéances avec cette devise */
    currency?: string;
}

/**
 * Statistiques d'allocation
 */
export interface AllocationStats {
    totalAllocated: number; // En centimes
    remainingAmount: number; // En centimes
    schedulesFullyPaid: number;
    schedulesPartiallyPaid: number;
}
