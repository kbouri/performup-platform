import { z } from "zod";

/**
 * Schema for recording a student payment
 */
export const recordStudentPaymentSchema = z.object({
    studentId: z.string().min(1, "Student ID is required"),
    amount: z.number().int().positive("Amount must be positive"),
    currency: z.enum(["EUR", "MAD", "USD"], {
        errorMap: () => ({ message: "Currency must be EUR, MAD, or USD" }),
    }),
    paymentDate: z.string().datetime("Invalid date format"),
    paymentMethod: z.string().optional(),
    referenceNumber: z.string().optional(),
    bankAccountId: z.string().optional(),
    notes: z.string().optional(),
    allocations: z
        .array(
            z.object({
                scheduleId: z.string().min(1, "Schedule ID is required"),
                amount: z.number().int().positive("Allocation amount must be positive"),
            })
        )
        .optional(),
});

/**
 * Schema for recording a mentor payment
 */
export const recordMentorPaymentSchema = z.object({
    mentorId: z.string().min(1, "Mentor ID is required"),
    missionId: z.string().min(1, "Mission ID is required"),
    amount: z.number().int().positive("Amount must be positive"),
    currency: z.enum(["EUR", "MAD", "USD"], {
        errorMap: () => ({ message: "Currency must be EUR, MAD, or USD" }),
    }),
    paymentDate: z.string().datetime("Invalid date format"),
    paymentMethod: z.string().optional(),
    referenceNumber: z.string().optional(),
    bankAccountId: z.string().min(1, "Bank account ID is required"),
    notes: z.string().optional(),
});

/**
 * Schema for recording a professor payment
 */
export const recordProfessorPaymentSchema = z.object({
    professorId: z.string().min(1, "Professor ID is required"),
    missionId: z.string().min(1, "Mission ID is required"),
    amount: z.number().int().positive("Amount must be positive"),
    currency: z.enum(["EUR", "MAD", "USD"], {
        errorMap: () => ({ message: "Currency must be EUR, MAD, or USD" }),
    }),
    paymentDate: z.string().datetime("Invalid date format"),
    paymentMethod: z.string().optional(),
    referenceNumber: z.string().optional(),
    bankAccountId: z.string().min(1, "Bank account ID is required"),
    notes: z.string().optional(),
});

/**
 * Schema for listing payments with filters
 */
export const listPaymentsSchema = z.object({
    type: z.enum(["STUDENT", "MENTOR", "PROFESSOR"]).optional(),
    studentId: z.string().optional(),
    mentorId: z.string().optional(),
    professorId: z.string().optional(),
    currency: z.enum(["EUR", "MAD", "USD"]).optional(),
    startDate: z.string().datetime("Invalid start date format").optional(),
    endDate: z.string().datetime("Invalid end date format").optional(),
    limit: z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().positive().max(100))
        .optional()
        .default("20"),
    offset: z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().int().nonnegative())
        .optional()
        .default("0"),
});

/**
 * Type exports for TypeScript
 */
export type RecordStudentPaymentInput = z.infer<
    typeof recordStudentPaymentSchema
>;
export type RecordMentorPaymentInput = z.infer<
    typeof recordMentorPaymentSchema
>;
export type RecordProfessorPaymentInput = z.infer<
    typeof recordProfessorPaymentSchema
>;
export type ListPaymentsInput = z.infer<typeof listPaymentsSchema>;
