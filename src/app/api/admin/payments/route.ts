import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";
import { listPaymentsSchema } from "@/lib/validation/payment.schemas";
import { ZodError } from "zod";

/**
 * GET /api/admin/payments
 * List payments with optional filters and pagination
 */
export async function GET(req: NextRequest) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        // Parse and validate query parameters
        const searchParams = req.nextUrl.searchParams;
        const queryParams = {
            type: searchParams.get("type") ?? undefined,
            studentId: searchParams.get("studentId") ?? undefined,
            mentorId: searchParams.get("mentorId") ?? undefined,
            professorId: searchParams.get("professorId") ?? undefined,
            currency: searchParams.get("currency") ?? undefined,
            startDate: searchParams.get("startDate") ?? undefined,
            endDate: searchParams.get("endDate") ?? undefined,
            limit: searchParams.get("limit") ?? "20",
            offset: searchParams.get("offset") ?? "0",
        };

        const validatedParams = listPaymentsSchema.parse(queryParams);

        // Build where clause
        const where: Record<string, unknown> = {};

        // Filter by type using the appropriate ID field
        // Payment type is derived from which ID is set (studentId, mentorId, professorId)
        if (validatedParams.type) {
            if (validatedParams.type === "STUDENT") {
                where.studentId = { not: null };
                where.mentorId = null;
                where.professorId = null;
            } else if (validatedParams.type === "MENTOR") {
                where.mentorId = { not: null };
                where.studentId = null;
                where.professorId = null;
            } else if (validatedParams.type === "PROFESSOR") {
                where.professorId = { not: null };
                where.studentId = null;
                where.mentorId = null;
            }
        }

        if (validatedParams.studentId) {
            where.studentId = validatedParams.studentId;
        }

        if (validatedParams.mentorId) {
            where.mentorId = validatedParams.mentorId;
        }

        if (validatedParams.professorId) {
            where.professorId = validatedParams.professorId;
        }

        if (validatedParams.currency) {
            where.currency = validatedParams.currency;
        }

        if (validatedParams.startDate || validatedParams.endDate) {
            where.paymentDate = {};
            if (validatedParams.startDate) {
                where.paymentDate.gte = new Date(validatedParams.startDate);
            }
            if (validatedParams.endDate) {
                where.paymentDate.lte = new Date(validatedParams.endDate);
            }
        }

        // Get total count
        const total = await prisma.payment.count({ where });

        // Get payments with pagination
        const payments = await prisma.payment.findMany({
            where,
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                mentor: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                professor: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                schedule: {
                    select: {
                        id: true,
                        type: true,
                        amount: true,
                        currency: true,
                        status: true,
                        dueDate: true,
                    },
                },
                bankAccount: {
                    select: {
                        id: true,
                        accountName: true,
                        bankName: true,
                        currency: true,
                    },
                },
                allocations: {
                    include: {
                        schedule: {
                            select: {
                                id: true,
                                dueDate: true,
                                amount: true,
                                status: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                paymentDate: "desc",
            },
            take: validatedParams.limit,
            skip: validatedParams.offset,
        });

        // Calculate summary by currency
        const summaryData = await prisma.payment.groupBy({
            by: ["currency"],
            where,
            _sum: {
                amount: true,
            },
            _count: {
                id: true,
            },
        });

        const summary = summaryData.map((item) => ({
            currency: item.currency,
            totalAmount: item._sum.amount ?? 0,
            count: item._count.id,
        }));

        return NextResponse.json({
            payments,
            total,
            hasMore: validatedParams.offset + payments.length < total,
            summary,
        });
    } catch (error) {
        // Handle Zod validation errors
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    error: "Validation error",
                    details: error.issues,
                },
                { status: 400 }
            );
        }

        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error listing payments:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
