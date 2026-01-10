import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";
import {
    createQuoteSchema,
    listQuotesSchema,
} from "@/lib/validation/quote.schemas";
import { generateQuoteNumber } from "@/lib/accounting";
import { ZodError } from "zod";

/**
 * POST /api/admin/quotes
 * Create a new quote for a student
 */
export async function POST(req: NextRequest) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        // Parse and validate request body
        const body = await req.json();
        const validatedData = createQuoteSchema.parse(body);

        // Verify student exists and has STUDENT role
        const student = await prisma.student.findUnique({
            where: { id: validatedData.studentId },
            include: {
                user: {
                    select: {
                        role: true,
                    },
                },
            },
        });

        if (!student || student.user.role !== "STUDENT") {
            return NextResponse.json(
                { error: "Invalid student ID" },
                { status: 400 }
            );
        }

        // Verify all packs exist
        const packIds = validatedData.packs.map((p) => p.packId);
        const packs = await prisma.studentPack.findMany({
            where: {
                id: { in: packIds },
                studentId: validatedData.studentId,
            },
            include: {
                pack: {
                    select: {
                        price: true,
                        currency: true,
                    },
                },
            },
        });

        if (packs.length !== packIds.length) {
            return NextResponse.json(
                { error: "One or more packs not found or do not belong to this student" },
                { status: 400 }
            );
        }

        // Calculate total amount
        let totalAmount = 0;
        const packPriceMap = new Map<string, number>();

        validatedData.packs.forEach((packInput) => {
            const pack = packs.find((p) => p.id === packInput.packId);
            if (pack) {
                const price = packInput.customPrice ?? pack.pack.price;
                totalAmount += price;
                packPriceMap.set(packInput.packId, price);
            }
        });

        // Verify payment schedule total matches quote total
        const scheduleTotal = validatedData.paymentSchedule.reduce(
            (sum, schedule) => sum + schedule.amount,
            0
        );

        if (scheduleTotal !== totalAmount) {
            return NextResponse.json(
                {
                    error: `Payment schedule total (${scheduleTotal}) does not match quote total (${totalAmount})`,
                },
                { status: 400 }
            );
        }

        // Get the currency from the first payment schedule (all should be the same)
        const currency = validatedData.paymentSchedule[0].currency;

        // Verify all schedules use the same currency
        const allSameCurrency = validatedData.paymentSchedule.every(
            (schedule) => schedule.currency === currency
        );

        if (!allSameCurrency) {
            return NextResponse.json(
                { error: "All payment schedules must use the same currency" },
                { status: 400 }
            );
        }

        // Generate unique quote number
        const quoteNumber = await generateQuoteNumber();

        // Create quote with items and payment schedules in a transaction
        const quote = await prisma.quote.create({
            data: {
                quoteNumber,
                studentId: validatedData.studentId,
                totalAmount,
                currency,
                status: "DRAFT",
                notes: validatedData.notes,
                items: {
                    create: validatedData.packs.map((packInput) => ({
                        studentPackId: packInput.packId,
                        amount: packPriceMap.get(packInput.packId) ?? 0,
                    })),
                },
                paymentSchedules: {
                    create: validatedData.paymentSchedule.map((schedule) => ({
                        dueDate: new Date(schedule.dueDate),
                        amount: schedule.amount,
                        currency: schedule.currency,
                        scheduleCurrency: schedule.currency,
                        status: "PENDING",
                        paidAmount: 0,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        studentPack: {
                            include: {
                                pack: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
                paymentSchedules: true,
            },
        });

        return NextResponse.json(quote, { status: 201 });
    } catch (error) {
        // Handle Zod validation errors
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    error: "Validation error",
                    details: error.errors,
                },
                { status: 400 }
            );
        }

        // Handle RBAC errors (thrown as Response objects)
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error creating quote:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/quotes
 * List quotes with optional filters
 */
export async function GET(req: NextRequest) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        // Parse and validate query parameters
        const searchParams = req.nextUrl.searchParams;
        const queryParams = {
            studentId: searchParams.get("studentId") ?? undefined,
            status: searchParams.get("status") ?? undefined,
            limit: searchParams.get("limit") ?? "20",
            offset: searchParams.get("offset") ?? "0",
        };

        const validatedParams = listQuotesSchema.parse(queryParams);

        // Build where clause
        const where: any = {};
        if (validatedParams.studentId) {
            where.studentId = validatedParams.studentId;
        }
        if (validatedParams.status) {
            where.status = validatedParams.status;
        }

        // Get total count
        const total = await prisma.quote.count({ where });

        // Get quotes with pagination
        const quotes = await prisma.quote.findMany({
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
                items: {
                    include: {
                        studentPack: {
                            include: {
                                pack: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
                paymentSchedules: {
                    orderBy: {
                        dueDate: "asc",
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: validatedParams.limit,
            skip: validatedParams.offset,
        });

        return NextResponse.json({
            quotes,
            total,
            hasMore: validatedParams.offset + quotes.length < total,
        });
    } catch (error) {
        // Handle Zod validation errors
        if (error instanceof ZodError) {
            return NextResponse.json(
                {
                    error: "Validation error",
                    details: error.errors,
                },
                { status: 400 }
            );
        }

        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error listing quotes:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
