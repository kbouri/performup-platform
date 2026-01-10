import { z } from "zod";

/**
 * Schema for creating a new quote
 */
export const createQuoteSchema = z.object({
    studentId: z.string().min(1, "Student ID is required"),
    packs: z
        .array(
            z.object({
                packId: z.string().min(1, "Pack ID is required"),
                customPrice: z
                    .number()
                    .int()
                    .positive("Custom price must be positive")
                    .optional(),
            })
        )
        .min(1, "At least one pack is required"),
    paymentSchedule: z
        .array(
            z.object({
                dueDate: z.string().datetime("Invalid date format"),
                amount: z
                    .number()
                    .int()
                    .positive("Amount must be positive"),
                currency: z.enum(["EUR", "MAD", "USD"], {
                    errorMap: () => ({ message: "Currency must be EUR, MAD, or USD" }),
                }),
            })
        )
        .min(1, "At least one payment schedule is required"),
    notes: z.string().optional(),
});

/**
 * Schema for updating an existing quote
 */
export const updateQuoteSchema = z.object({
    packs: z
        .array(
            z.object({
                packId: z.string().min(1, "Pack ID is required"),
                customPrice: z
                    .number()
                    .int()
                    .positive("Custom price must be positive")
                    .optional(),
            })
        )
        .min(1, "At least one pack is required")
        .optional(),
    paymentSchedule: z
        .array(
            z.object({
                dueDate: z.string().datetime("Invalid date format"),
                amount: z
                    .number()
                    .int()
                    .positive("Amount must be positive"),
                currency: z.enum(["EUR", "MAD", "USD"], {
                    errorMap: () => ({ message: "Currency must be EUR, MAD, or USD" }),
                }),
            })
        )
        .min(1, "At least one payment schedule is required")
        .optional(),
    notes: z.string().optional(),
});

/**
 * Schema for listing quotes with filters
 */
export const listQuotesSchema = z.object({
    studentId: z.string().optional(),
    status: z
        .enum(["DRAFT", "SENT", "VALIDATED", "REJECTED", "EXPIRED"])
        .optional(),
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
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
export type ListQuotesInput = z.infer<typeof listQuotesSchema>;
