import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/middleware/rbac";
import { updateQuoteSchema } from "@/lib/validation/quote.schemas";
import { ZodError } from "zod";

/**
 * GET /api/admin/quotes/[id]
 * Get a specific quote by ID
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        const quoteId = params.id;

        // Fetch quote with all related data
        const quote = await prisma.quote.findUnique({
            where: { id: quoteId },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                id: true,
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
                                        id: true,
                                        name: true,
                                        description: true,
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
        });

        if (!quote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        return NextResponse.json(quote);
    } catch (error) {
        // Handle RBAC errors
        if (error instanceof Response) {
            return error;
        }

        // Handle other errors
        console.error("Error fetching quote:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/quotes/[id]
 * Update a quote (only if status is DRAFT)
 */
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Check admin authentication
        await requireAdmin(req);

        const quoteId = params.id;

        // Check if quote exists and is in DRAFT status
        const existingQuote = await prisma.quote.findUnique({
            where: { id: quoteId },
            include: {
                items: true,
                paymentSchedules: true,
            },
        });

        if (!existingQuote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        if (existingQuote.status !== "DRAFT") {
            return NextResponse.json(
                {
                    error: `Cannot update quote with status ${existingQuote.status}. Only DRAFT quotes can be updated.`,
                },
                { status: 403 }
            );
        }

        // Parse and validate request body
        const body = await req.json();
        const validatedData = updateQuoteSchema.parse(body);

        // If no updates provided, return current quote
        if (
            !validatedData.packs &&
            !validatedData.paymentSchedule &&
            !validatedData.notes
        ) {
            return NextResponse.json(existingQuote);
        }

        // Prepare update data
        let totalAmount = existingQuote.totalAmount;
        let currency = existingQuote.currency;

        // If packs are being updated, verify and recalculate
        if (validatedData.packs) {
            const packIds = validatedData.packs.map((p) => p.packId);
            const packs = await prisma.studentPack.findMany({
                where: {
                    id: { in: packIds },
                    studentId: existingQuote.studentId,
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
                    {
                        error:
                            "One or more packs not found or do not belong to this student",
                    },
                    { status: 400 }
                );
            }

            // Recalculate total amount
            totalAmount = 0;
            const packPriceMap = new Map<string, number>();

            validatedData.packs.forEach((packInput) => {
                const pack = packs.find((p) => p.id === packInput.packId);
                if (pack) {
                    const price = packInput.customPrice ?? pack.pack.price;
                    totalAmount += price;
                    packPriceMap.set(packInput.packId, price);
                }
            });

            // If payment schedule is also being updated, verify totals match
            if (validatedData.paymentSchedule) {
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

                currency = validatedData.paymentSchedule[0].currency;

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
            }

            // Update quote in a transaction
            const updatedQuote = await prisma.$transaction(async (tx) => {
                // Delete old items
                await tx.quoteItem.deleteMany({
                    where: { quoteId },
                });

                // Delete old payment schedules if being updated
                if (validatedData.paymentSchedule) {
                    await tx.paymentSchedule.deleteMany({
                        where: { quoteId },
                    });
                }

                // Update quote with new data
                return await tx.quote.update({
                    where: { id: quoteId },
                    data: {
                        totalAmount,
                        currency,
                        notes: validatedData.notes ?? existingQuote.notes,
                        items: {
                            create: validatedData.packs!.map((packInput) => ({
                                studentPackId: packInput.packId,
                                amount: packPriceMap.get(packInput.packId) ?? 0,
                            })),
                        },
                        ...(validatedData.paymentSchedule && {
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
                        }),
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
                        paymentSchedules: {
                            orderBy: {
                                dueDate: "asc",
                            },
                        },
                    },
                });
            });

            return NextResponse.json(updatedQuote);
        }

        // If only payment schedule or notes are being updated
        if (validatedData.paymentSchedule) {
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

            currency = validatedData.paymentSchedule[0].currency;

            const updatedQuote = await prisma.$transaction(async (tx) => {
                await tx.paymentSchedule.deleteMany({
                    where: { quoteId },
                });

                return await tx.quote.update({
                    where: { id: quoteId },
                    data: {
                        currency,
                        notes: validatedData.notes ?? existingQuote.notes,
                        paymentSchedules: {
                            create: validatedData.paymentSchedule!.map((schedule) => ({
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
                        paymentSchedules: {
                            orderBy: {
                                dueDate: "asc",
                            },
                        },
                    },
                });
            });

            return NextResponse.json(updatedQuote);
        }

        // If only notes are being updated
        const updatedQuote = await prisma.quote.update({
            where: { id: quoteId },
            data: {
                notes: validatedData.notes,
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
                paymentSchedules: {
                    orderBy: {
                        dueDate: "asc",
                    },
                },
            },
        });

        return NextResponse.json(updatedQuote);
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
        console.error("Error updating quote:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
