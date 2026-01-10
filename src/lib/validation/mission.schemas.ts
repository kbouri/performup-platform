import { z } from "zod";

/**
 * Schema for creating a new mission
 */
export const createMissionSchema = z
    .object({
        type: z.enum(["MENTOR", "PROFESSOR"], {
            errorMap: () => ({ message: "Type must be MENTOR or PROFESSOR" }),
        }),
        mentorId: z.string().optional(),
        professorId: z.string().optional(),
        description: z.string().min(1, "Description is required"),
        amount: z.number().int().positive("Amount must be positive"),
        currency: z.enum(["EUR", "MAD", "USD"], {
            errorMap: () => ({ message: "Currency must be EUR, MAD, or USD" }),
        }),
        startDate: z.string().datetime("Invalid start date format"),
        endDate: z.string().datetime("Invalid end date format"),
        notes: z.string().optional(),
    })
    .refine(
        (data) => {
            if (data.type === "MENTOR") return !!data.mentorId;
            if (data.type === "PROFESSOR") return !!data.professorId;
            return false;
        },
        {
            message:
                "mentorId required for MENTOR type, professorId for PROFESSOR type",
            path: ["mentorId", "professorId"],
        }
    )
    .refine(
        (data) => new Date(data.startDate) < new Date(data.endDate),
        {
            message: "Start date must be before end date",
            path: ["startDate", "endDate"],
        }
    );

/**
 * Schema for updating an existing mission
 */
export const updateMissionSchema = z
    .object({
        description: z.string().min(1, "Description cannot be empty").optional(),
        amount: z.number().int().positive("Amount must be positive").optional(),
        currency: z
            .enum(["EUR", "MAD", "USD"], {
                errorMap: () => ({ message: "Currency must be EUR, MAD, or USD" }),
            })
            .optional(),
        startDate: z.string().datetime("Invalid start date format").optional(),
        endDate: z.string().datetime("Invalid end date format").optional(),
        notes: z.string().optional(),
    })
    .refine(
        (data) => {
            if (data.startDate && data.endDate) {
                return new Date(data.startDate) < new Date(data.endDate);
            }
            return true;
        },
        {
            message: "Start date must be before end date",
            path: ["startDate", "endDate"],
        }
    );

/**
 * Schema for rejecting a mission
 */
export const rejectMissionSchema = z.object({
    reason: z.string().optional(),
});

/**
 * Schema for listing missions with filters
 */
export const listMissionsSchema = z.object({
    type: z.enum(["MENTOR", "PROFESSOR"]).optional(),
    mentorId: z.string().optional(),
    professorId: z.string().optional(),
    status: z.enum(["PENDING", "VALIDATED", "PAID", "REJECTED"]).optional(),
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
export type CreateMissionInput = z.infer<typeof createMissionSchema>;
export type UpdateMissionInput = z.infer<typeof updateMissionSchema>;
export type RejectMissionInput = z.infer<typeof rejectMissionSchema>;
export type ListMissionsInput = z.infer<typeof listMissionsSchema>;
